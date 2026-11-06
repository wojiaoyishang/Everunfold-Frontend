/** Complete public releases with a durable minimum-version barrier. Never contains drafts. */
import { open, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/core/contracts/content-admin-v1-schema";
import type { ContentDelivery } from "@/core/contracts/content-admin";
import { parsePublicSnapshot } from "../../core/content/validation";
import { jsonDigest, publishImmutableJson } from "../storage/immutable-json";

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

export interface ContentStore {
  maxBytes: number;
  apply(value: unknown): Promise<ContentDelivery>;
}

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
  private checked(input: unknown): ContentDelivery {
    if (
      !validate(input) ||
      input.node_id !== this.nodeId ||
      input.source_epoch !== this.sourceEpoch ||
      input.value.source_epoch !== this.sourceEpoch ||
      input.value.generation !== input.revision ||
      !Number.isSafeInteger(input.revision)
    )
      throw new Error("Invalid content delivery");
    parsePublicSnapshot(input.value);
    return input;
  }
  private async json(filename: string, maximum = this.maxBytes) {
    const file = await open(filename, "r");
    try {
      if ((await file.stat()).size > maximum)
        throw new Error("Content revision is too large");
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
    const names = await readdir(this.folder());
    const revisions = names.flatMap((name) => {
      const match = /^public-content\.(\d+)\.(?:intent|snapshot)\.json$/.exec(
        name,
      );
      return match && Number.isSafeInteger(Number(match[1]))
        ? [Number(match[1])]
        : [];
    });
    if (!revisions.length) throw new Error("Managed content is missing");
    const revision = revisions.reduce(
      (latest, value) => Math.max(latest, value),
      0,
    );
    const intent = await this.json(
      path.join(this.folder(), `public-content.${revision}.intent.json`),
      4096,
    );
    const value = this.checked(
      await this.json(
        path.join(this.folder(), `public-content.${revision}.snapshot.json`),
      ),
    );
    if (
      value.revision !== revision ||
      jsonDigest(intent) !== jsonDigest({ revision, digest: jsonDigest(value) })
    )
      throw new Error("Incomplete or conflicting content release");
    return parsePublicSnapshot(value.value);
  }
  async apply(input: unknown) {
    const value = this.checked(input);
    if (Buffer.byteLength(JSON.stringify(value)) > this.maxBytes)
      throw new Error("Content release is too large");
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
