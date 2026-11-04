import {
  readFile,
  readdir,
  mkdir,
  writeFile,
  copyFile,
} from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "node_modules/katex");
const pkg = JSON.parse(
  await readFile(path.join(source, "package.json"), "utf8"),
);
const target = path.join(
  root,
  "public/content-features",
  "katex-" + pkg.version,
);
await mkdir(path.join(target, "fonts"), { recursive: true });
let css = await readFile(path.join(source, "dist/katex-swap.min.css"), "utf8");
css = css.replace(/,url\([^)]*\.(?:woff|ttf)\) format\([^)]*\)/g, "");
await writeFile(path.join(target, "katex.min.css"), css);
await copyFile(path.join(source, "LICENSE"), path.join(target, "LICENSE.txt"));
for (const file of await readdir(path.join(source, "dist/fonts")))
  if (file.endsWith(".woff2"))
    await copyFile(
      path.join(source, "dist/fonts", file),
      path.join(target, "fonts", file),
    );
console.log(
  "Prepared local KaTeX " + pkg.version + " styles/fonts (no runtime CDN).",
);
