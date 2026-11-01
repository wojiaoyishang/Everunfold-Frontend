/** Node-only storage adapter. No identity, credentials or article body belongs here. */
import { createHash, randomUUID } from "node:crypto";
import { open, mkdir, readFile, readdir, link, unlink } from "node:fs/promises";
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

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function settingsDigest(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

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
    await mkdir(this.folder(), { recursive: true });
    const target = path.join(
      this.folder(),
      `${value.resource}.${value.revision}.json`,
    );
    const staging = path.join(this.folder(), `.staging-${randomUUID()}`);
    const bytes = canonical(value);
    const file = await open(staging, "wx", 0o600);
    try {
      await file.writeFile(bytes, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      try {
        await link(staging, target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const existing = this.checked(
          JSON.parse(await readFile(target, "utf8")),
        );
        if (canonical(existing) !== bytes)
          throw new Error("Conflicting settings revision");
      }
      // Flush directory entries where supported. Windows NTFS uses file flush + atomic link;
      // sudden power-loss guarantees still depend on the filesystem and device.
      if (process.platform !== "win32") {
        const dir = await open(this.folder(), "r");
        try {
          await dir.sync();
        } finally {
          await dir.close();
        }
      }
    } finally {
      await unlink(staging).catch(() => {});
    }
    return value;
  }
}
