import { parseDocument, DomUtils } from "htmlparser2";
import type { ContentFeatures } from "./model";
import { codeLineMarkup } from "./code-frame";

type Element = ReturnType<typeof DomUtils.findAll>[number];
function isFormula(node: Element) {
  if (
    !["span", "div"].includes(node.name) ||
    !["inline", "block"].includes(node.attribs["data-math"])
  )
    return false;
  let parent = node.parent;
  while (parent) {
    if (
      "name" in parent &&
      (["pre", "code"].includes(parent.name) || parent.attribs["data-math"])
    )
      return false;
    parent = parent.parent;
  }
  return true;
}

export function inspectContentFeatures(html: string): ContentFeatures {
  const nodes = DomUtils.findAll(
    (node) => node.name === "pre" || isFormula(node),
    parseDocument(html).children,
  );
  return {
    code: nodes.some((node) => node.name === "pre"),
    math: nodes.some((node) => node.name !== "pre"),
  };
}

/** Input is the already-sanitized reader projection. Engine output never enters stored source. */
export async function enhanceContentHtml(html: string) {
  const document = parseDocument(html);
  const nodes = DomUtils.findAll(
    (node) => node.name === "pre" || isFormula(node),
    document.children,
  );
  await Promise.all(
    nodes.map(async (node) => {
      try {
        if (node.name === "pre") {
          const code = node.children.find(
            (child) => "name" in child && child.name === "code",
          );
          if (!code || !("attribs" in code)) return;
          const language =
            /\blanguage-([\w+-]+)/.exec(
              code.attribs.class ?? node.attribs.class ?? "",
            )?.[1] ?? "plaintext";
          const { highlightCode } = await import("./code");
          const frame =
            node.parent &&
            "attribs" in node.parent &&
            "data-code-frame" in node.parent.attribs
              ? node.parent
              : undefined;
          const source: string = frame
            ? JSON.parse(frame.attribs["data-code-source"])
            : DomUtils.textContent(code);
          const rows = DomUtils.findAll(
            (child) => child.attribs.class?.split(" ").includes("code-line"),
            code.children,
          );
          const marked = rows
            .filter((row) => row.attribs.class.includes("code-line-marked"))
            .map((row) => row.attribs["data-line"])
            .join(",");
          const highlighted = await highlightCode(source, language);
          code.children = parseDocument(
            frame && !code.attribs["data-code-plain"]
              ? codeLineMarkup(
                  highlighted,
                  Number(rows[0]?.attribs["data-line"] ?? 1),
                  marked,
                )
              : highlighted,
          ).children;
          code.attribs["data-highlighted"] = "true";
        } else {
          const { renderFormula } = await import("./math");
          node.children = parseDocument(
            renderFormula(
              node.attribs["data-latex"] ?? DomUtils.textContent(node),
              node.attribs["data-math"] === "block",
            ).html,
          ).children;
          node.attribs["data-typeset"] = "true";
        }
      } catch {
        /* A resource failure keeps readable source and the rest of the article. */
      }
    }),
  );
  return DomUtils.getOuterHTML(document);
}
