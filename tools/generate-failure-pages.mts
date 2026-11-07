import { writeArtifact } from "./write-artifact.mjs";
/** Build the snapshot-independent HTTP fallback from the same theme components and game. */
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { FailureSurface } from "../src/themes/argon/failure/failure-surface";
import { failureStyles } from "../src/themes/argon/failure/styles";
import { initializeAppearance } from "../src/core/browser/appearance-policy";
import { initializeMotion } from "../src/core/browser/motion-policy";

const root = new URL("../", import.meta.url);
const file = new URL("var/cache/build/failure-pages.json", root);
const gameSources = await Promise.all(
  ["pair-game", "enhance-failure"].map((name) =>
    readFile(new URL(`src/themes/argon/failure/${name}.ts`, root), "utf8"),
  ),
);
// Explicit module compilation, rather than Function.toString(), is independent of bundler/minifier transforms.
const game =
  gameSources
    .map(
      (source) =>
        ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        }).outputText,
    )
    .join("\n") +
  "\nenhanceFailure(document.querySelector('.failure-surface'), createPairGame);\n";
const data = {
  generated:
    "Do not edit. Run npm run failure:generate; source: themes/argon/failure.",
  styles: failureStyles,
  appearance: initializeAppearance + initializeMotion,
  game,
  pages: Object.fromEntries(
    ([404, 503] as const).map((status) => [
      status,
      renderToStaticMarkup(createElement(FailureSurface, { status })),
    ]),
  ),
};
const output = JSON.stringify(data, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if ((await readFile(file, "utf8")) !== output)
    throw new Error(
      "Error-page artifact is stale. Run npm run failure:generate.",
    );
  console.log("Error-page generated artifact matches its source.");
} else {
  await mkdir(new URL("var/cache/build/", root), { recursive: true });
  await writeArtifact(file, output);
  console.log(`Generated ${fileURLToPath(file)}.`);
}
