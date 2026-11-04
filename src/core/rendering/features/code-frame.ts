import { DomUtils, parseDocument } from "htmlparser2";
import { codeLanguage, escapeMarkup } from "./model";
import { markedCodeLine, parseCodeOptions } from "./code-options";

const attr = (value: string) => escapeMarkup(value).replaceAll('"', "&quot;");

/** Split token text, not serialized HTML: multiline comments/strings keep their spans. */
export function codeLineMarkup(highlighted: string, start = 1, marks = "") {
  const lines: string[] = [""];
  const walk = (
    nodes: ReturnType<typeof parseDocument>["children"],
    classes: string[] = [],
  ) => {
    for (const node of nodes) {
      if (node.type === "text") {
        const parts = node.data.split(/\r\n|\r|\n/);
        parts.forEach((part, index) => {
          if (index) lines.push("");
          const text = escapeMarkup(part);
          lines[lines.length - 1] +=
            classes.length && text
              ? `<span class="${attr(classes.join(" "))}">${text}</span>`
              : text;
        });
      } else if ("children" in node)
        walk(
          node.children,
          "attribs" in node && node.name === "span"
            ? [
                ...classes,
                ...(node.attribs.class ?? "")
                  .split(/\s+/)
                  .filter((c) => /^hljs-[\w-]+$/.test(c)),
              ]
            : classes,
        );
    }
  };
  walk(parseDocument(highlighted).children);
  if (lines.length > 1 && !lines.at(-1)) lines.pop();
  return lines
    .map(
      (line, index) =>
        `<span class="code-line${markedCodeLine(start + index, marks) ? " code-line-marked" : ""}" data-line="${start + index}"><span class="code-line-text">${line || "&#8203;"}</span></span>`,
    )
    .join("");
}

/** Called only after sanitization. All frame markup and source attributes are derived here. */
export function frameCodeHtml(html: string) {
  const document = parseDocument(html, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const blocks = DomUtils.findAll(
    (node) => node.name === "pre",
    document.children,
  );
  const replacements: { start: number; end: number; markup: string }[] = [];
  for (const pre of blocks) {
    if (
      pre.startIndex === null ||
      pre.endIndex === null ||
      (pre.parent &&
        "attribs" in pre.parent &&
        "data-code-frame" in pre.parent.attribs)
    )
      continue;
    const code = pre.children.find(
      (node) => "name" in node && node.name === "code",
    );
    const source = DomUtils.textContent(code ?? pre);
    const language = codeLanguage(
      /\blanguage-([\w+-]+)/.exec(
        code && "attribs" in code
          ? (code.attribs.class ?? "")
          : (pre.attribs.class ?? ""),
      )?.[1] ?? "",
    );
    const options = parseCodeOptions(pre.attribs["data-code"]);
    const rows =
      source.split(/\r\n|\r|\n/).length -
      Number(/(?:\r\n|\r|\n)$/.test(source));
    const large = source.length > 100_000 || rows > 5000;
    const foldSize = options.fold
      ? `calc(${options.fold} * var(--code-line-height,1.7) * var(--code-font-size,13px) + 28px)`
      : "none";
    const localStyle =
      options.fold === undefined
        ? ""
        : ` style="--code-fold-lines:${options.fold};--code-fold-size:${foldSize}"`;
    const label = options.title || language.toUpperCase();
    const body = large
      ? escapeMarkup(source)
      : codeLineMarkup(escapeMarkup(source), options.start, options.mark);
    const markup = [
      '<figure class="content-code-frame" data-code-frame',
      ` data-code-language="${language}" data-code-source="${attr(JSON.stringify(source))}"`,
      ` data-numbers="${large ? "off" : (options.numbers ?? "inherit")}" data-wrap="${options.wrap ?? "inherit"}" data-lines="${rows}"${localStyle}>`,
      `<figcaption><span class="code-caption"><span class="code-caption-title">${escapeMarkup(label)}</span>`,
      options.title
        ? `<span class="code-language">${escapeMarkup(language)}</span>`
        : "",
      "</span><span data-code-tools></span></figcaption>",
      `<pre tabindex="0" aria-label="${attr(options.title || language + " 代码")}">`,
      `<code class="language-${language}"${large ? ' data-code-plain="true"' : ""}>${body}</code></pre></figure>`,
    ].join("");
    replacements.push({ start: pre.startIndex, end: pre.endIndex + 1, markup });
  }
  return replacements
    .sort((a, b) => b.start - a.start)
    .reduce(
      (value, patch) =>
        value.slice(0, patch.start) + patch.markup + value.slice(patch.end),
      html,
    );
}
