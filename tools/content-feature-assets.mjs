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
const editorSource = path.join(root, "node_modules/mathlive");
const editorPackage = JSON.parse(
  await readFile(path.join(editorSource, "package.json"), "utf8"),
);
const editorTarget = path.join(
  root,
  "public/content-features",
  "mathlive-" + editorPackage.version,
);
await mkdir(path.join(editorTarget, "fonts"), { recursive: true });
const editorCss = (
  await readFile(path.join(editorSource, "mathlive-fonts.css"), "utf8")
).replace(/font-display:\s*\w+/g, "font-display:swap");
await writeFile(path.join(editorTarget, "fonts.css"), editorCss);
await copyFile(
  path.join(editorSource, "LICENSE.txt"),
  path.join(editorTarget, "LICENSE.txt"),
);
for (const file of await readdir(path.join(editorSource, "fonts")))
  if (file.endsWith(".woff2"))
    await copyFile(
      path.join(editorSource, "fonts", file),
      path.join(editorTarget, "fonts", file),
    );
console.log(
  "Prepared local MathLive " + editorPackage.version + " authoring fonts.",
);
