import {
  EditorSelection,
  type EditorState,
  type TransactionSpec,
} from "@codemirror/state";

export type SourceCommand =
  | { kind: "tab" }
  | {
      kind: "wrap";
      before: string;
      after: string;
      placeholder?: string;
      block?: boolean;
      escapeHtml?: boolean;
    }
  | { kind: "lines"; style: "bullet" | "ordered" | "task" | "quote" }
  | { kind: "heading"; level: number; format: "markdown" | "html" };

/** Small source edits: shared Y.Text, selection mapping and undo stay with CodeMirror. */
export function sourceCommand(
  state: EditorState,
  command: SourceCommand,
): TransactionSpec {
  const spec = state.changeByRange((range) => {
    if (command.kind === "tab") {
      return {
        changes: { from: range.from, insert: "\t" },
        range: EditorSelection.range(range.anchor + 1, range.head + 1),
      };
    }
    if (command.kind === "wrap") {
      const { before, after } = command;
      const selected = state.sliceDoc(range.from, range.to);
      const italicTokens = (left: string, right: string) =>
        before !== "*" ||
        ((/\*+$/.exec(left)?.[0].length ?? 0) % 2 === 1 &&
          (/^\*+/.exec(right)?.[0].length ?? 0) % 2 === 1);
      if (
        !command.block &&
        selected.startsWith(before) &&
        selected.endsWith(after) &&
        italicTokens(
          /^\*+/.exec(selected)?.[0] ?? "",
          /\*+$/.exec(selected)?.[0] ?? "",
        ) &&
        selected.length >= before.length + after.length
      ) {
        const inner = selected.slice(before.length, -after.length || undefined);
        return {
          changes: { from: range.from, to: range.to, insert: inner },
          range: EditorSelection.range(range.from, range.from + inner.length),
        };
      }
      if (
        !command.block &&
        range.from >= before.length &&
        state.sliceDoc(range.from - before.length, range.from) === before &&
        state.sliceDoc(range.to, range.to + after.length) === after &&
        italicTokens(
          state.sliceDoc(state.doc.lineAt(range.from).from, range.from),
          state.sliceDoc(range.to, state.doc.lineAt(range.to).to),
        )
      ) {
        return {
          changes: [
            { from: range.from - before.length, to: range.from, insert: "" },
            { from: range.to, to: range.to + after.length, insert: "" },
          ],
          range: EditorSelection.range(
            range.from - before.length,
            range.to - before.length,
          ),
        };
      }
      let content = selected || command.placeholder || "";
      if (command.escapeHtml)
        content = content
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      const leading =
        command.block &&
        range.from > 0 &&
        state.sliceDoc(range.from - 1, range.from) !== "\n"
          ? "\n\n"
          : "";
      const trailing =
        command.block &&
        range.to < state.doc.length &&
        state.sliceDoc(range.to, range.to + 1) !== "\n"
          ? "\n\n"
          : "";
      const anchor = range.from + leading.length + before.length;
      return {
        changes: {
          from: range.from,
          to: range.to,
          insert: leading + before + content + after + trailing,
        },
        range: EditorSelection.range(anchor, anchor + content.length),
      };
    }
    const first = state.doc.lineAt(range.from);
    const last = state.doc.lineAt(
      range.to > range.from && state.doc.lineAt(range.to).from === range.to
        ? range.to - 1
        : range.to,
    );
    const lines = Array.from(
      { length: last.number - first.number + 1 },
      (_, i) => state.doc.line(first.number + i),
    );
    if (command.kind === "heading") {
      const level = Math.min(6, Math.max(0, command.level));
      const changes = lines.flatMap((line) => {
        if (command.format === "markdown") {
          const existing = /^(\s{0,3})(?:#{1,6}\s+)?/.exec(line.text)![0];
          return [
            {
              from: line.from,
              to: line.from + existing.length,
              insert: `${/^\s{0,3}/.exec(line.text)![0]}${"#".repeat(level)}${level ? " " : ""}`,
            },
          ];
        }
        const opening = /^(\s*)<(?:h[1-6]|p)(\s[^>]*)?>/i.exec(line.text);
        const closing = /<\/(?:h[1-6]|p)>(\s*)$/i.exec(line.text);
        const tag = level ? `h${level}` : "p";
        return [
          {
            from: line.from,
            to: line.from + (opening?.[0].length ?? 0),
            insert: `${opening?.[1] ?? ""}<${tag}${opening?.[2] ?? ""}>`,
          },
          {
            from: line.to - (closing?.[0].length ?? 0),
            to: line.to,
            insert: `</${tag}>${closing?.[1] ?? ""}`,
          },
        ];
      });
      return {
        changes,
        range:
          command.format === "html" &&
          first.number === last.number &&
          !first.text.trim()
            ? EditorSelection.cursor(first.from + (level ? 4 : 3))
            : range.map(state.changes(changes)),
      };
    }
    const pattern =
      command.style === "quote"
        ? /^(\s*)> ?/
        : /^(\s*)(?:[-+*] \[[ xX]\] |[-+*] |\d+[.)] )/;
    const desired = (index: number) =>
      ({
        bullet: "- ",
        ordered: `${index + 1}. `,
        task: "- [ ] ",
        quote: "> ",
      })[command.style];
    const matches = lines.map((line) => pattern.exec(line.text));
    const remove = lines.every((line, i) => {
      const marker = matches[i]?.[0].trimStart();
      if (command.style === "ordered") return /^\d+[.)] $/.test(marker ?? "");
      if (command.style === "task")
        return /^[-+*] \[[ xX]\] $/.test(marker ?? "");
      return marker === desired(i);
    });
    const changes = lines.map((line, i) => {
      const indent = /^\s*/.exec(line.text)![0];
      const match = matches[i];
      return {
        from: line.from,
        to: line.from + (match?.[0].length ?? indent.length),
        insert: indent + (remove ? "" : desired(i)),
      };
    });
    return { changes, range: range.map(state.changes(changes)) };
  });
  return { ...spec, scrollIntoView: true, userEvent: "input.format" };
}
