import type MarkdownIt from "markdown-it";
import { formulaHtml } from "./model";

/** Parse source tokens, never replace dollar signs in rendered HTML/code. */
export function markdownMath(md: InstanceType<typeof MarkdownIt>) {
  md.inline.ruler.before("escape", "math_inline", (state, silent) => {
    const start = state.pos;
    if (
      state.src[start] !== "$" ||
      state.src[start - 1] === "$" ||
      state.src[start + 1] === "$" ||
      /\s/.test(state.src[start + 1] ?? " ")
    )
      return false;
    let end = start + 1;
    while ((end = state.src.indexOf("$", end)) !== -1) {
      let slashes = 0;
      for (let i = end - 1; state.src[i] === "\\"; i--) slashes++;
      if (slashes % 2) {
        end++;
        continue;
      }
      if (
        /\s/.test(state.src[end - 1]) ||
        /\d/.test(state.src[end + 1] ?? "") ||
        /[\n`]/.test(state.src.slice(start, end))
      )
        return false;
      if (!silent) {
        const token = state.push("math_inline", "", 0);
        token.content = state.src.slice(start + 1, end);
      }
      state.pos = end + 1;
      return true;
    }
    return false;
  });
  md.block.ruler.before(
    "fence",
    "math_block",
    (state, start, end, silent) => {
      const line = state.src.slice(
        state.bMarks[start] + state.tShift[start],
        state.eMarks[start],
      );
      if (state.sCount[start] - state.blkIndent >= 4 || !line.startsWith("$$"))
        return false;
      const parts = [line.slice(2)];
      let next = start;
      if (!parts[0].trimEnd().endsWith("$$")) {
        for (next = start + 1; next < end; next++) {
          parts.push(
            state.src.slice(
              state.bMarks[next] + state.tShift[next],
              state.eMarks[next],
            ),
          );
          if (parts.at(-1)!.trimEnd().endsWith("$$")) break;
        }
        if (next === end) return false;
      }
      if (silent) return true;
      const token = state.push("math_block", "", 0);
      token.block = true;
      token.map = [start, next + 1];
      token.content = parts.join("\n").trimEnd().slice(0, -2).trim();
      state.line = next + 1;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );
  md.renderer.rules.math_inline = (tokens, index) =>
    formulaHtml(tokens[index].content, false);
  md.renderer.rules.math_block = (tokens, index) =>
    formulaHtml(tokens[index].content, true) + "\n";
}
