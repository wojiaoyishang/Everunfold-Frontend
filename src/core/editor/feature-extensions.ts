import { Extension, Node as EditorNode } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { parseDocument } from "htmlparser2";
import { codeLanguage } from "@/core/rendering/features/model";

/** Local visual nodes only; shared richFields/WS schema continues to preserve source HTML. */
function formulaNode(display: boolean) {
  return EditorNode.create({
    name: display ? "blockMath" : "inlineMath",
    group: display ? "block" : "inline",
    inline: !display,
    atom: true,
    selectable: true,
    addAttributes: () => ({ latex: { default: "" } }),
    parseHTML: () => [
      {
        tag: `${display ? "div" : "span"}[data-math="${display ? "block" : "inline"}"]`,
        getAttrs: (element) => ({
          latex:
            element.getAttribute("data-latex") ?? element.textContent ?? "",
        }),
      },
    ],
    renderHTML: ({ node }) => [
      display ? "div" : "span",
      {
        "data-math": display ? "block" : "inline",
        "data-latex": node.attrs.latex,
      },
      node.attrs.latex,
    ],
    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement(display ? "div" : "span");
        dom.contentEditable = "false";
        dom.dataset.math = display ? "block" : "inline";
        let alive = true;
        const show = (latex: string) => {
          dom.textContent = latex;
          dom.dataset.latex = latex;
          void import("@/core/rendering/features/math")
            .then(({ renderFormula }) => {
              if (alive && dom.dataset.latex === latex)
                dom.innerHTML = renderFormula(latex, display).html;
            })
            .catch(() => {});
        };
        show(String(node.attrs.latex));
        return {
          dom,
          update(next) {
            if (next.type !== node.type) return false;
            show(String(next.attrs.latex));
            return true;
          },
          ignoreMutation: () => true,
          destroy: () => {
            alive = false;
          },
        };
      };
    },
  });
}
export const localFormulaNodes = [formulaNode(false), formulaNode(true)];

type Token = { from: number; to: number; className: string };
function highlightTokens(html: string) {
  const result: Token[] = [];
  let offset = 0;
  const walk = (
    nodes: ReturnType<typeof parseDocument>["children"],
    classes = "",
  ) => {
    for (const node of nodes) {
      if (node.type === "text") {
        if (classes && node.data)
          result.push({
            from: offset,
            to: offset + node.data.length,
            className: classes,
          });
        offset += node.data.length;
      } else if ("children" in node)
        walk(
          node.children,
          "attribs" in node
            ? [classes, node.attribs.class ?? ""].filter(Boolean).join(" ")
            : classes,
        );
    }
  };
  walk(parseDocument(html).children);
  return result;
}
export const LocalCodeHighlight = Extension.create({
  name: "localCodeHighlight",
  addProseMirrorPlugins() {
    const key = new PluginKey("everunfold-code-highlight");
    const cache = new Map<string, Token[]>(),
      pending = new Set<string>();
    const listeners = new Set<() => void>();
    const blocks = (doc: Parameters<typeof DecorationSet.create>[0]) => {
      const items: {
        text: string;
        language: string;
        pos: number;
        id: string;
      }[] = [];
      doc.descendants((node, pos) => {
        if (node.type.name !== "codeBlock") return;
        const language = codeLanguage(String(node.attrs.language ?? "")),
          text = node.textContent;
        if (language !== "plaintext" && text.length <= 100_000)
          items.push({ text, language, pos, id: language + "\0" + text });
      });
      return items;
    };
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            return DecorationSet.create(
              state.doc,
              blocks(state.doc).flatMap(({ id, pos }) =>
                (cache.get(id) ?? []).map((token) =>
                  Decoration.inline(pos + 1 + token.from, pos + 1 + token.to, {
                    class: token.className,
                  }),
                ),
              ),
            );
          },
        },
        view(view) {
          let alive = true;
          const refresh = () => {
            if (alive) view.dispatch(view.state.tr.setMeta(key, true));
          };
          listeners.add(refresh);
          const update = () => {
            for (const block of blocks(view.state.doc)) {
              if (cache.has(block.id) || pending.has(block.id)) continue;
              pending.add(block.id);
              void import("@/core/rendering/features/code")
                .then(({ highlightCode }) =>
                  highlightCode(block.text, block.language),
                )
                .then((html) => {
                  if (cache.size >= 64)
                    cache.delete(cache.keys().next().value!);
                  cache.set(block.id, highlightTokens(html));
                  pending.delete(block.id);
                  for (const listener of listeners) listener();
                })
                .catch(() => {
                  pending.delete(block.id);
                });
            }
          };
          update();
          return {
            update,
            destroy: () => {
              alive = false;
              listeners.delete(refresh);
            },
          };
        },
      }),
    ];
  },
});
