import { readdirSync, lstatSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

export function nodeCatalogSource(root, commonjs = false) {
  const imports = [],
    outputs = [];
  let sequence = 0;
  for (const [kind, entry, exported] of [
    ["themes", "theme.ts", "themeModules"],
  ]) {
    const pairs = [];
    const directory = path.join(root, "src", kind);
    for (const name of readdirSync(directory).sort()) {
      const info = lstatSync(path.join(directory, name));
      if (info.isSymbolicLink())
        throw new Error(`Extension symlinks are not supported: ${name}`);
      if (!info.isDirectory()) continue;
      const file = path.join(directory, name, entry);
      if (!lstatSync(file).isFile())
        throw new Error(`Missing ${kind} declaration: ${name}/${entry}`);
      const id = "extension" + sequence++;
      imports.push(
        commonjs
          ? `const ${id} = require(${JSON.stringify(file)}).default;`
          : `import ${id} from ${JSON.stringify(pathToFileURL(file).href)};`,
      );
      pairs.push(`${JSON.stringify(`/src/${kind}/${name}/${entry}`)}: ${id}`);
    }
    outputs.push(
      commonjs
        ? `exports.${exported} = {${pairs.join(",")}};`
        : `export const ${exported} = {${pairs.join(",")}};`,
    );
  }
  return [...imports, ...outputs].join("\n");
}
