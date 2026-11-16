/** Node-only storage adapter. No identity, credentials or article body belongs here. */
import { open } from "node:fs/promises";
import { jsonDigest, publishImmutableJson } from "../storage/immutable-json";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/core/contracts/settings-v1-schema";
import { SyncValidationError } from "../sync-diagnostics";
import type { SettingsDelivery } from "@/core/contracts/settings";
import {
  clearedRevision,
  clearRevisions,
  pruneRevisions,
  revisionFiles,
  revisionUsage,
} from "../storage/revisions";

const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "settings",
);
const validate = ajv.compile<SettingsDelivery>({
  $ref: "settings#/properties/delivery",
});
export type SettingsResource = SettingsDelivery["resource"];
export interface SettingsStore {
  read(resource: SettingsResource): Promise<SettingsDelivery | null>;
  apply(value: unknown): Promise<SettingsDelivery>;
}

export const settingsDigest = jsonDigest;

/** Immutable revision files + atomic hard-link publication avoid cross-process lost updates.
 * A partial staging file is never a visible revision. Highest committed revision always wins.
 * The operator pins the source epoch; a database restore requires deliberate epoch rotation.
 */
export class FileSettingsStore implements SettingsStore {
  constructor(
    readonly directory: string,
    readonly nodeId: string,
    readonly sourceEpoch: string,
  ) {}
  private checked(value: unknown): SettingsDelivery {
    if (
      !validate(value) ||
      value.protocol !== "settings-1" ||
      !Number.isSafeInteger(value.revision) ||
      (value.resource === "public-settings") !== "site" in value.value
    )
      throw new SyncValidationError("settings_schema_invalid");
    if (value.node_id !== this.nodeId)
      throw new SyncValidationError("node_mismatch");
    if (value.source_epoch !== this.sourceEpoch)
      throw new SyncValidationError("source_epoch_mismatch");
    return value;
  }
  private folder() {
    return path.join(this.directory, this.nodeId, this.sourceEpoch);
  }
  private files(resource: SettingsResource) {
    return revisionFiles(
      this.folder(),
      new RegExp(`^${resource}\\.([1-9]\\d*)(?:\\.(floor))?\\.json$`),
    );
  }
  usage(resource: SettingsResource, verifiedRevision: number | null) {
    return this.files(resource).then((files) =>
      revisionUsage(this.folder(), files, verifiedRevision),
    );
  }
  async prune(resource: SettingsResource) {
    const current = await this.read(resource).catch(() => null);
    if (!current) return { removed_files: 0, removed_bytes: 0 };
    return pruneRevisions(
      this.folder(),
      await this.files(resource),
      current.revision,
    );
  }
  async clear(resource: SettingsResource) {
    return clearRevisions(this.folder(), resource, await this.files(resource));
  }
  async read(resource: SettingsResource) {
    const files = await this.files(resource);
    const newest = files.find((file) => !file.barrier);
    if (!newest || newest.revision < clearedRevision(files)) return null;
    try {
      return await this.readRevision(resource, newest.name, newest.revision);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const current = await this.files(resource);
      const latest = current.find((file) => !file.barrier);
      if (!latest || latest.revision < clearedRevision(current)) return null;
      if (latest.revision <= newest.revision) throw error;
      // Cleanup can remove a revision we selected just as its successor arrived.
      return this.readRevision(resource, latest.name, latest.revision);
    }
  }
  private async readRevision(
    resource: SettingsResource,
    name: string,
    revision: number,
  ) {
    const file = await open(path.join(this.folder(), name), "r");
    try {
      if ((await file.stat()).size > 65536)
        throw new Error("Oversized settings revision");
      const value = this.checked(JSON.parse(await file.readFile("utf8")));
      if (value.resource !== resource || value.revision !== revision)
        throw new Error("Settings revision mismatch");
      return value;
    } finally {
      await file.close();
    }
  }
  async apply(input: unknown) {
    const value = this.checked(input);
    if (value.revision < clearedRevision(await this.files(value.resource)))
      return value;
    await publishImmutableJson(
      path.join(this.folder(), `${value.resource}.${value.revision}.json`),
      value,
    );
    return value;
  }
}
