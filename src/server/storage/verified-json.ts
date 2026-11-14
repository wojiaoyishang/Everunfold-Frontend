import { createHash } from "node:crypto";
import { open } from "node:fs/promises";

type VerifiedFile<Value> = {
  digest: string;
  version: string | undefined;
  size: number;
  value: Value;
};

function freezeJson(value: unknown) {
  if (typeof value !== "object" || value === null) return;
  const pending: object[] = [value];
  while (pending.length) {
    const item = pending.pop()!;
    Object.freeze(item);
    for (const child of Object.values(item)) {
      if (typeof child === "object" && child !== null) pending.push(child);
    }
  }
}

/** Reuse decoded public data only after verifying the bytes and publication identity from disk. */
export class VerifiedJsonCache<Value> {
  private readonly entries = new Map<string, VerifiedFile<Value>>();
  private storedBytes = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly maxSourceBytes: number,
  ) {}

  async read(
    filename: string,
    maxFileBytes: number,
    verify: (input: unknown) => Value,
    version?: string,
  ): Promise<Value> {
    const file = await open(filename, "r");
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > maxFileBytes)
        throw new Error("Invalid or oversized public JSON file");
      const bytes = await file.readFile();
      if (bytes.length > maxFileBytes)
        throw new Error("Oversized public JSON file");

      const digest = createHash("sha256").update(bytes).digest("hex");
      const entry = this.entries.get(filename);
      if (entry?.digest === digest && entry.version === version)
        return entry.value;

      this.remove(filename);
      const value = verify(JSON.parse(bytes.toString("utf8")));
      freezeJson(value);
      if (bytes.length <= this.maxSourceBytes) {
        this.entries.set(filename, {
          digest,
          version,
          size: bytes.length,
          value,
        });
        this.storedBytes += bytes.length;
        while (
          this.entries.size > this.maxEntries ||
          this.storedBytes > this.maxSourceBytes
        ) {
          const oldest = this.entries.keys().next().value;
          if (oldest === undefined) break;
          this.remove(oldest);
        }
      }
      return value;
    } finally {
      await file.close();
    }
  }

  private remove(filename: string) {
    const entry = this.entries.get(filename);
    if (!entry) return;
    this.entries.delete(filename);
    this.storedBytes -= entry.size;
  }
}
