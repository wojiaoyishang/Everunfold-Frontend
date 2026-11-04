import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { highlightTree, tags } from "@lezer/highlight";
import { markdownEditorLanguage } from "../src/core/editor/markdown-language";
import {
  codeLanguageDescription,
  loadCodeLanguage,
} from "../src/core/editor/code-language";
import { sourceHighlight } from "../src/themes/argon/components/ui/source-highlight";
import { codeLanguages } from "../src/core/rendering/features/model";

function highlighted(source: string) {
  const state = EditorState.create({
    doc: source,
    extensions: [markdownEditorLanguage],
  });
  const tree = ensureSyntaxTree(state, source.length, 500);
  assert.ok(tree);
  const spans: { from: number; to: number; classes: string }[] = [];
  highlightTree(tree, sourceHighlight, (from, to, classes) =>
    spans.push({ from, to, classes }),
  );
  assert.equal(state.doc.toString(), source);
  return (word: string) => {
    const at = source.indexOf(word);
    assert.ok(at >= 0, word);
    return spans.find(({ from, to }) => from <= at && to >= at + word.length)
      ?.classes;
  };
}

test("Markdown source distinguishes GFM syntax while retaining literal source", () => {
  const at = highlighted(
    "## 标题\n\n**粗体** *斜体* ~~删除~~ `inline` [链接](/hello)\n\n> 引用\n\n- 列表\n",
  );
  const cases = [
    ["标题", tags.heading2],
    ["粗体", tags.strong],
    ["斜体", tags.emphasis],
    ["删除", tags.strikethrough],
    ["inline", tags.monospace],
    ["/hello", tags.url],
    ["引用", tags.quote],
    ["列表", tags.list],
  ] as const;
  for (const [word, tag] of cases) {
    const expected = sourceHighlight.style([tag]);
    assert.ok(expected, word);
    assert.ok(at(word)?.split(" ").includes(expected), word);
  }
  const colors = sourceHighlight.specs
    .map((spec) => spec.color)
    .filter(Boolean);
  assert.ok(
    new Set(colors).size >= 5,
    "syntax must use more than weight/italic variations",
  );
});

test("fence metadata selects the JavaScript grammar without consuming code as Markdown", async () => {
  const description = codeLanguageDescription(
    'js {"title":"hello.js","numbers":"on"}',
  )!;
  assert.equal(description, codeLanguageDescription("javascript"));
  const language = await description.load();
  // Inspect the loaded grammar directly: Node uses separate CJS/ESM Lezer trees,
  // whereas the browser bundles one instance for nested Markdown highlighting.
  const tree = language.language.parser
    .parse('const greeting = "hello"; // note')
    .toString();
  assert.match(tree, /VariableDeclaration/);
  assert.match(tree, /String/);
  assert.match(tree, /LineComment/);
});

test("fence aliases and snippet editors share grammar loads; unknown fences remain plain", async () => {
  assert.equal(
    codeLanguageDescription('PY {"fold":10}'),
    codeLanguageDescription("python"),
  );
  assert.equal(codeLanguageDescription("not-a-real-language"), null);
  assert.equal(codeLanguageDescription("text"), null);
  assert.equal(codeLanguageDescription(""), null);
  assert.equal(
    await codeLanguageDescription("py")!.load(),
    await loadCodeLanguage("python"),
  );
  const source = "```not-a-real-language\n<literal>你好 & **raw**\n```\n";
  highlighted(source);
});

test("every registered snippet language retains a real grammar after sharing the loader", async () => {
  const plain = await loadCodeLanguage("plaintext");
  await Promise.all(
    codeLanguages
      .filter(([name]) => name !== "plaintext")
      .map(async ([name]) => {
        assert.notEqual(await loadCodeLanguage(name), plain, name);
      }),
  );
});
