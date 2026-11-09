import { readFile, realpath, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { writeArtifact } from "../write-artifact.mjs";

/** Package-local font files follow the same content-hash/atomic-publish rules as other assets. */
export async function bundleFonts(source, directory, fonts, target, assets) {
  const root = await realpath(source);
  return Promise.all(
    fonts.map(async (font) => ({
      ...font,
      faces: await Promise.all(
        (font.faces ?? []).map(async (face) => {
          if (!face.src.startsWith("asset:")) return face;
          const original = await realpath(path.join(source, face.src.slice(6)));
          const extension = path.extname(original).slice(1).toLowerCase();
          const expectedFormat = {
            woff2: "woff2",
            woff: "woff",
            ttf: "truetype",
            otf: "opentype",
          }[extension];
          if (
            !original.startsWith(root + path.sep) ||
            !["woff2", "woff", "ttf", "otf"].includes(extension) ||
            face.format !== expectedFormat ||
            !(await stat(original)).isFile()
          )
            throw new Error("Invalid plugin font asset");
          const bytes = await readFile(original);
          if (!bytes.length || bytes.length > 16 * 1024 * 1024)
            throw new Error("Plugin font asset exceeds package limits");
          const sha256 = createHash("sha256").update(bytes).digest("hex"),
            file = `asset.${sha256}.${extension}`;
          await writeArtifact(path.join(target, file), bytes);
          assets[file] = { sha256, bytes: bytes.length };
          return {
            ...face,
            src: `/__plugins/assets/${encodeURIComponent(directory)}/${file}`,
          };
        }),
      ),
    })),
  );
}
