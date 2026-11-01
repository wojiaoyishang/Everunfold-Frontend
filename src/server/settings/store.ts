/** Node-only storage adapter. No identity, credentials or article body belongs here. */
import { open, readdir } from "node:fs/promises";
import { jsonDigest, publishImmutableJson } from "../storage/immutable-json";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../../generated/settings-v1.schema.json";
import type { SettingsDelivery } from "../../generated/settings-contract";

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
      value.node_id !== this.nodeId ||
      value.source_epoch !== this.sourceEpoch ||
      (value.resource === "public-settings") !== "site" in value.value
    )
      throw new Error("Invalid settings delivery");
    return value;
  }
  private folder() {
    return path.join(this.directory, this.nodeId, this.sourceEpoch);
  }
  async read(resource: SettingsResource) {
    let names: string[];
    try {
      names = await readdir(this.folder());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    const pattern = new RegExp(`^${resource}\\.(\\d+)\\.json$`);
    const revisions = names
      .flatMap((name) => {
        const match = pattern.exec(name);
        return match ? [{ name, revision: Number(match[1]) }] : [];
      })
      .sort((a, b) => b.revision - a.revision);
    if (!revisions.length) return null;
    const newest = revisions[0];
    const file = await open(path.join(this.folder(), newest.name), "r");
    try {
      if ((await file.stat()).size > 65536)
        throw new Error("Oversized settings revision");
      const value = this.checked(JSON.parse(await file.readFile("utf8")));
      if (value.resource !== resource || value.revision !== newest.revision)
        throw new Error("Settings revision mismatch");
      return value;
    } finally {
      await file.close();
    }
  }
  async apply(input: unknown) {
    const value = this.checked(input);
    await publishImmutableJson(
      path.join(this.folder(), `${value.resource}.${value.revision}.json`),
      value,
    );
    return value;
  }
}
