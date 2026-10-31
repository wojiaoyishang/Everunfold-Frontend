import { createElement, Fragment, type ReactNode } from "react";
import MarkdownIt from "markdown-it";
import { publicHref, resourceUrl } from "@/core/content/urls";
import { stickerSources } from "./stickers";

const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });
type Token = ReturnType<typeof markdown.parse>[number];
const allowed = new Set([
  "p",
  "blockquote",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "s",
  "a",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

/** Markdown tokens become a closed set of React elements, never arbitrary HTML. */
export function commentMarkdown(
  body: string,
  code?: (text: string, language: string) => ReactNode,
): ReactNode {
  function render(tokens: Token[], prefix: string): ReactNode[] {
    const root: {
      tag: string;
      props: Record<string, unknown>;
      children: ReactNode[];
    } = { tag: "", props: {}, children: [] };
    const stack = [root];
    tokens.forEach((token, index) => {
      const current = stack[stack.length - 1];
      const key = `${prefix}-${index}`;
      if (token.type === "inline")
        current.children.push(...render(token.children ?? [], key));
      else if (token.type === "text" || token.type.startsWith("html"))
        current.children.push(token.content);
      else if (token.type === "softbreak" || token.type === "hardbreak")
        current.children.push(<br key={key} />);
      else if (token.type === "code_inline")
        current.children.push(<code key={key}>{token.content}</code>);
      else if (token.type === "fence" || token.type === "code_block")
        current.children.push(
          <Fragment key={key}>
            {code ? (
              code(token.content, token.info.trim().split(/\s+/)[0])
            ) : (
              <pre>
                <code>{token.content}</code>
              </pre>
            )}
          </Fragment>,
        );
      else if (token.type === "hr") current.children.push(<hr key={key} />);
      else if (token.type === "image") {
        const src = resourceUrl(String(token.attrGet("src") ?? ""));
        if (src)
          current.children.push(
            createElement("img", {
              key,
              src,
              alt: token.content,
              loading: "lazy",
              decoding: "async",
              className: stickerSources.has(src)
                ? "comment-sticker"
                : "comment-picture",
              "data-sticker": stickerSources.has(src) ? "true" : undefined,
            }),
          );
        else current.children.push(token.content);
      } else if (token.nesting === 1) {
        const tag = /^h[1-6]$/.test(token.tag)
          ? "strong"
          : allowed.has(token.tag)
            ? token.tag
            : "span";
        const props: Record<string, unknown> = { key };
        if (tag === "a") {
          const href = publicHref(String(token.attrGet("href") ?? ""));
          if (href)
            Object.assign(props, {
              href,
              rel: "nofollow noopener noreferrer",
              ...(href.startsWith("http") ? { target: "_blank" } : {}),
            });
        }
        if (tag === "ol" && /^\d+$/.test(String(token.attrGet("start") ?? "")))
          props.start = Number(token.attrGet("start"));
        stack.push({ tag, props, children: [] });
      } else if (token.nesting === -1 && stack.length > 1) {
        const node = stack.pop()!;
        stack[stack.length - 1].children.push(
          createElement(node.tag, node.props, ...node.children),
        );
      }
    });
    return root.children;
  }
  return render(markdown.parse(body.slice(0, 2000), {}), "comment");
}
