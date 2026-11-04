import { StreamLanguage } from "@codemirror/language";
import {
  snippetCompletion,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { formulaTemplates } from "./templates";

const snippets = formulaTemplates.map((item) =>
  snippetCompletion(item.latex.replace(/#(?:0|\?)/g, "${}"), {
    label: item.latex.match(/^\\[a-zA-Z]+/)?.[0] ?? item.name,
    detail: item.name,
    type: "function",
  }),
);
export function latexCompletions(context: CompletionContext) {
  const command = context.matchBefore(/\\[a-zA-Z]*/);
  if (!command) return null;
  return { from: command.from, options: snippets, validFor: /^\\[a-zA-Z]*$/ };
}
/** A TeX lexer for source assistance; publication validity comes from KaTeX. */
export const latexLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/^%[^\n]*/)) return "comment";
    if (stream.match(/^\\(?:[a-zA-Z]+|.)/)) return "keyword";
    if (stream.match(/^[{}()[\]]/)) return "bracket";
    if (stream.match(/^[0-9]+(?:\.[0-9]+)?/)) return "number";
    if (stream.match(/^[\^_&=+*/<>|-]/)) return "operator";
    stream.next();
    return null;
  },
  languageData: {
    autocomplete: latexCompletions,
    closeBrackets: { brackets: ["(", "[", "{"] },
    commentTokens: { line: "%" },
  },
});
