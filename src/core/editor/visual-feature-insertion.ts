import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import type {
  ContentFeatureKind,
  ContentFeatureValue,
} from "./content-feature-source";

export function prepareVisualFeature(editor: Editor, kind: ContentFeatureKind) {
  const { selection } = editor.state;
  const node =
    selection.$from.parent.type.name === "codeBlock"
      ? selection.$from.parent
      : selection instanceof NodeSelection
        ? selection.node
        : undefined;
  const existing =
    kind === "code"
      ? node?.type.name === "codeBlock"
      : ["inlineMath", "blockMath"].includes(node?.type.name ?? "");
  let range =
    existing && node
      ? {
          from:
            node.type.name === "codeBlock"
              ? selection.$from.before()
              : selection.from,
          to:
            node.type.name === "codeBlock"
              ? selection.$from.after()
              : selection.to,
        }
      : { from: selection.from, to: selection.to };
  const map = ({
    transaction,
  }: {
    transaction: Parameters<Editor["state"]["apply"]>[0];
  }) => {
    range = {
      from: transaction.mapping.map(range.from, 1),
      to: transaction.mapping.map(range.to, -1),
    };
  };
  editor.on("transaction", map);
  const dispose = () => editor.off("transaction", map);
  return {
    initial:
      existing && node
        ? {
            source:
              kind === "code" ? node.textContent : String(node.attrs.latex),
            language: String(node.attrs.language ?? "plaintext"),
            display: node.type.name !== "inlineMath",
          }
        : {
            source: editor.state.doc.textBetween(selection.from, selection.to),
          },
    dispose,
    apply(value: ContentFeatureValue) {
      dispose();
      if (
        editor.isDestroyed ||
        !editor.isEditable ||
        range.from > range.to ||
        range.to > editor.state.doc.content.size
      )
        return;
      editor
        .chain()
        .focus()
        .insertContentAt(
          range,
          kind === "code"
            ? {
                type: "codeBlock",
                attrs: { language: value.language },
                content: [{ type: "text", text: value.source }],
              }
            : {
                type: value.display ? "blockMath" : "inlineMath",
                attrs: { latex: value.source },
              },
        )
        .run();
    },
  };
}
