/** Snapshot Unicode's qualified flag emoji; no runtime network or new dependency. */
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const url = "https://www.unicode.org/Public/emoji/latest/emoji-test.txt";
const source = await (await fetch(url)).text();
const version = /^# Version: (.+)$/m.exec(source)?.[1];
if (!version || !source.includes("# group: Flags"))
  throw new Error("Invalid Unicode emoji data");
const flags = [];
let active = false;
for (const line of source.split("\n")) {
  if (line.startsWith("# group:")) active = line === "# group: Flags";
  if (!active) continue;
  const match =
    /^([0-9A-F ]+)\s*; fully-qualified\s*#\s*\S+\s+E[\d.]+\s+(.+)$/.exec(line);
  if (!match) continue;
  const points = match[1]
    .trim()
    .split(/\s+/)
    .map((code) => parseInt(code, 16));
  const code =
    points.length === 2 &&
    points.every((point) => point >= 0x1f1e6 && point <= 0x1f1ff)
      ? points
          .map((point) => String.fromCharCode(point - 0x1f1e6 + 65))
          .join("")
      : match[1].trim().replace(/ +/g, "-");
  flags.push({
    code,
    emoji: String.fromCodePoint(...points),
    name: match[2].replace(/^flag: /, ""),
  });
}
if (flags.length < 250) throw new Error("Incomplete flag dataset");
const directory = "src/core/i18n/data";
await mkdir(directory, { recursive: true });
await writeFile(
  directory + "/flags.json",
  JSON.stringify(flags, null, 2) + "\n",
);
await writeFile(
  directory + "/unicode-license.txt",
  await (await fetch("https://www.unicode.org/license.txt")).text(),
);
await writeFile(
  directory + "/README.md",
  `# Flag emoji data\n\nDerived from [Unicode emoji-test.txt](${url}), version ${version}. Fully qualified entries from the Flags group, including country/region, subdivision and general flags.\n\nSource SHA256: ${createHash("sha256").update(source).digest("hex")}. Snapshot date: ${new Date().toISOString().slice(0, 10)}.\n\nUnicode data is licensed under [Unicode License V3](./unicode-license.txt). Names are displayed through the browser's Intl/CLDR region names when available; unknown names retain the Unicode label.\n\nRegenerate with \`node tools/update-unicode-flags.mjs\`. The app uses the committed data and never fetches it at runtime.\n`,
);
console.log(`Stored ${flags.length} flags from Unicode ${version}`);
