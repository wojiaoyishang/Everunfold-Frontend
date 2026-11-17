// Use the synchronous parser entry for the eagerly discovered theme modules.
import parse from "postcss/lib/parse";
import selectors from "postcss-selector-parser";
import { scaleFontDeclaration } from "@/core/themes/font-sizing";

export const authoredCssLimit = 16000;
export const componentCssLimit = 4096;

const scopeAttribute = "data-authored-css";
const conditionalRules = new Set(["media", "supports"]);
const legacyPseudoElement = /^:(after|before|first-letter|first-line)$/i;
const resourceFunction =
  /(?:^|[^\w-])(?:url|src|image|-webkit-image-set|image-set|expression)\s*\(/i;

export function authoredCssScope(id: string) {
  return { [scopeAttribute]: id };
}

export function compileAuthoredCss(
  source: string,
  id: string,
  limit = authoredCssLimit,
): { css: string; error?: "syntax" | "unsupported" } {
  if (!source.trim()) return { css: "" };
  // Disallow escaped resource names and HTML raw-text boundaries before serializing into <style>.
  if (source.length > limit || /[\\\u0000]|<\/style/i.test(source))
    return { css: "", error: "unsupported" };
  if (!/^[a-z0-9_-]+$/i.test(id)) return { css: "", error: "syntax" };

  const anchor = selectors().astSync(`[${scopeAttribute}="${id}"]`).first.first;
  const target = selectors().astSync(`:where(${anchor}, ${anchor} *)`).first
    .first;
  const scope = selectors((root) => {
    root.each((selector) => {
      selector.walkPseudos((pseudo) => {
        if (pseudo.value.toLowerCase() === ":scope" && !pseudo.nodes?.length)
          pseudo.replaceWith(anchor.clone());
      });
      // Constrain the selected element even when the selector uses sibling combinators.
      const subject = selector.nodes.slice(
        selector.nodes.findLastIndex((node) => node.type === "combinator") + 1,
      );
      const pseudo = subject.find(
        (node) =>
          node.type === "pseudo" &&
          (node.value.startsWith("::") || legacyPseudoElement.test(node.value)),
      );
      if (pseudo) selector.insertBefore(pseudo, target.clone());
      else selector.append(target.clone());
    });
  });

  try {
    const root = parse(source);
    let unsupported = false;
    root.walk((node) => {
      if (node.type === "comment") node.remove();
      else if (node.type === "atrule") {
        unsupported =
          !conditionalRules.has(node.name.toLowerCase()) ||
          !node.nodes ||
          node.parent?.type === "rule";
      } else if (node.type === "decl") {
        unsupported =
          node.parent?.type !== "rule" ||
          resourceFunction.test(node.value.replace(/\/\*[\s\S]*?\*\//g, ""));
        if (!unsupported)
          node.value = scaleFontDeclaration(node.prop, node.value);
      } else if (node.type === "rule") {
        unsupported =
          node.parent?.type === "rule" || node.selector.includes("&");
        if (!unsupported) node.selector = scope.processSync(node.selector);
      }
      if (unsupported) return false;
    });
    return unsupported
      ? { css: "", error: "unsupported" }
      : { css: root.toString() };
  } catch {
    return { css: "", error: "syntax" };
  }
}
