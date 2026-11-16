/** Complete public releases with a durable minimum-version barrier. Never contains drafts. */
import { open, readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/core/contracts/content-admin-v1-schema";
import { SyncValidationError } from "../sync-diagnostics";
import type { ContentDelivery } from "@/core/contracts/content-admin";
import type { PublicSnapshot } from "@/core/content/types";
import { parsePublicSnapshot } from "../../core/content/validation";
import { jsonDigest, publishImmutableJson } from "../storage/immutable-json";
import {
  clearedRevision,
  clearRevisions,
  pruneRevisions,
  removeReplicaFiles,
  revisionFiles,
  revisionUsage,
} from "../storage/revisions";
import { VerifiedJsonCache } from "../storage/verified-json";

const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "content-release",
);
const validate = ajv.compile<ContentDelivery>({
  $ref: "content-release#/properties/delivery",
});
const decodedSnapshots = new VerifiedJsonCache<PublicSnapshot>(
  2,
  16 * 1024 * 1024,
);

export function readLegacySnapshot(directory: string, maxBytes: number) {
  return decodedSnapshots.read(
    path.resolve(directory, "current.json"),
    maxBytes,
    parsePublicSnapshot,
  );
}

export interface ContentStore {
  maxBytes: number;
  read(): Promise<PublicSnapshot | null>;
  apply(value: unknown): Promise<ContentDelivery>;
}

export class ClearedPublicContent extends Error {}

export class FileContentStore implements ContentStore {
  constructor(
    readonly directory: string,
    readonly nodeId: string,
    readonly sourceEpoch: string,
    readonly maxBytes = 8388608,
  ) {}
  private marker() {
    return path.join(this.directory, "managed.json");
  }
  private folder() {
    return path.join(this.directory, "releases", this.nodeId, this.sourceEpoch);
  }
  private files() {
    return revisionFiles(
      this.folder(),
      /^public-content\.([1-9]\d*)\.(intent|snapshot|floor)\.json$/,
    );
  }
  usage(verifiedRevision: number | null) {
    return this.files().then((files) =>
      revisionUsage(this.folder(), files, verifiedRevision),
    );
  }
  async prune() {
    const current = await this.read().catch(() => null);
    if (!current?.generation) return { removed_files: 0, removed_bytes: 0 };
    return pruneRevisions(
      this.folder(),
      await this.files(),
      current.generation,
    );
  }
  async clear() {
    // A managed node may still have a pre-sync current.json. Fence that fallback
    // before removing any replica, including when no managed release has arrived.
    await publishImmutableJson(this.marker(), {
      node_id: this.nodeId,
      source_epoch: this.sourceEpoch,
    });
    const legacy = await removeReplicaFiles(this.directory, ["current.json"]);
    const managed = await clearRevisions(
      this.folder(),
      "public-content",
      await this.files(),
    );
    return {
      removed_files: legacy.removed_files + managed.removed_files,
      removed_bytes: legacy.removed_bytes + managed.removed_bytes,
    };
  }
  private checked(input: unknown): ContentDelivery {
    if (!validate(input) || !Number.isSafeInteger(input.revision))
      throw new SyncValidationError("content_schema_invalid");
    if (input.node_id !== this.nodeId)
      throw new SyncValidationError("node_mismatch");
    if (
      input.source_epoch !== this.sourceEpoch ||
      input.value.source_epoch !== this.sourceEpoch
    )
      throw new SyncValidationError("source_epoch_mismatch");
    if (input.value.generation !== input.revision)
      throw new SyncValidationError("revision_mismatch");
    return input;
  }
  private async readIntent(filename: string) {
    const file = await open(filename, "r");
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > 4096)
        throw new Error("Invalid content intent file");
      return JSON.parse(await file.readFile("utf8")) as unknown;
    } finally {
      await file.close();
    }
  }
  async read() {
    let marker: unknown;
    try {
      marker = JSON.parse(await readFile(this.marker(), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    if (
      jsonDigest(marker) !==
      jsonDigest({ node_id: this.nodeId, source_epoch: this.sourceEpoch })
    )
      throw new Error("Content source binding changed");
    const files = await this.files();
    const [latest] = files;
    if (!latest) throw new Error("Managed content is missing");
    try {
      return await this.readRevision(latest.revision);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const [newest] = await this.files();
      if (newest && newest.revision > latest.revision)
        return this.readRevision(newest.revision);
      if (clearedRevision(files) === latest.revision)
        throw new ClearedPublicContent(
          "The public content replica has been cleared",
        );
      throw error;
    }
  }
  private async readRevision(revision: number) {
    const folder = this.folder();
    const intent = await this.readIntent(
      path.join(folder, `public-content.${revision}.intent.json`),
    );
    const intentDigest = jsonDigest(intent);
    return decodedSnapshots.read(
      path.resolve(folder, `public-content.${revision}.snapshot.json`),
      this.maxBytes,
      (input) => {
        const value = this.checked(input);
        if (
          value.revision !== revision ||
          intentDigest !== jsonDigest({ revision, digest: jsonDigest(value) })
        )
          throw new Error("Incomplete or conflicting content release");
        return parsePublicSnapshot(value.value);
      },
      intentDigest,
    );
  }
  async apply(input: unknown) {
    const value = this.checked(input);
    parsePublicSnapshot(value.value);
    if (Buffer.byteLength(JSON.stringify(value)) > this.maxBytes)
      throw new Error("Content release is too large");
    if (value.revision < clearedRevision(await this.files())) return value;
    await publishImmutableJson(this.marker(), {
      node_id: this.nodeId,
      source_epoch: this.sourceEpoch,
    });
    // Once a newer version is known, a failed write must never expose a revoked older body.
    await publishImmutableJson(
      path.join(this.folder(), `public-content.${value.revision}.intent.json`),
      { revision: value.revision, digest: jsonDigest(value) },
    );
    await publishImmutableJson(
      path.join(
        this.folder(),
        `public-content.${value.revision}.snapshot.json`,
      ),
      value,
    );
    return value;
  }
}
