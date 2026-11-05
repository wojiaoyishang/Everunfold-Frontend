import MarkdownIt from "markdown-it";
import type { PublicShortcode } from "@/generated/settings-contract";

export type ShortcodeNode = {
  from: number;
  to: number;
  name: string;
  attributes: Record<string, string>;
  children: ShortcodeNode[];
  bodyFrom: number;
  bodyTo: number;
  error?: string;
};
export type ShortcodeDiagnostic = { from: number; to: number; message: string };
const markdown = new MarkdownIt({ html: true });

function protectedRanges(source: string, isMarkdown: boolean) {
  const ranges: { from: number; to: number }[] = [];
  if (isMarkdown) {
    const lines = [0];
    for (const match of source.matchAll(/\n/g)) lines.push(match.index + 1);
    for (const token of markdown.parse(source, {}))
      if (["fence", "code_block"].includes(token.type) && token.map)
        ranges.push({
          from: lines[token.map[0]],
          to: lines[token.map[1]] ?? source.length,
        });
  }
  const html =
    /<!--(?:[\s\S]*?-->|[\s\S]*$)|<(pre|code)\b(?:[^>"']|"[^"]*"|'[^']*')*>(?:[\s\S]*?<\/\1\s*>|[\s\S]*$)|<\/?[a-z][\w:-]*(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  for (const match of source.matchAll(html))
    ranges.push({ from: match.index, to: match.index + match[0].length });
  if (isMarkdown) {
    const ticks = /(`+)[\s\S]*?\1(?!`)/g;
    for (const match of source.matchAll(ticks))
      ranges.push({ from: match.index, to: match.index + match[0].length });
  }
  return ranges.sort((a, b) => a.from - b.from || b.to - a.to);
}

function readHead(source: string, from: number) {
  let quoted = false,
    escaped = false,
    end = from + 3;
  for (; end < Math.min(source.length, from + 4096); end++) {
    const char = source[end];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (char === '"') quoted = !quoted;
    if (!quoted && source.startsWith(">}}", end)) break;
  }
  if (!source.startsWith(">}}", end)) return;
  const raw = source.slice(from + 3, end).trim();
  const name = /^(\/?)([a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)?)(?=\s|$)/.exec(raw);
  if (!name) return;
  const attributes: Record<string, string> = {};
  let rest = raw.slice(name[0].length),
    error: string | undefined;
  while (rest.trim()) {
    const attribute =
      /^\s+([a-z][a-z0-9_]*)\s*=\s*("(?:[^"\\\r\n]|\\["\\/bfnrt]|\\u[\da-fA-F]{4})*")/.exec(
        rest,
      );
    if (!attribute || name[1] || Object.hasOwn(attributes, attribute[1])) {
      error = "参数需要唯一名称和双引号值";
      break;
    }
    attributes[attribute[1]] = JSON.parse(attribute[2]) as string;
    rest = rest.slice(attribute[0].length);
    if (Object.keys(attributes).length > 16) {
      error = "参数过多";
      break;
    }
  }
  return {
    name: name[2],
    close: Boolean(name[1]),
    attributes,
    error,
    to: end + 3,
  };
}

/** Parse only the native delimiter. Protected examples and unclosed containers retain their source. */
export function parseShortcodes(
  source: string,
  definitions: readonly Pick<PublicShortcode, "name" | "kind">[],
  isMarkdown = false,
) {
  const known = new Map(
    definitions.map((definition) => [definition.name, definition]),
  );
  const nodes: ShortcodeNode[] = [],
    stack: ShortcodeNode[] = [],
    diagnostics: ShortcodeDiagnostic[] = [];
  const ranges = protectedRanges(source, isMarkdown);
  let range = 0;
  for (let at = 0; at < source.length;) {
    while (range < ranges.length && ranges[range].to <= at) range++;
    if (ranges[range]?.from <= at) {
      at = Math.max(at + 1, ranges[range].to);
      continue;
    }
    if (!source.startsWith("{{<", at)) {
      at++;
      continue;
    }
    const slashes =
      /\\+$/.exec(source.slice(Math.max(0, at - 64), at))?.[0].length ?? 0;
    if (slashes % 2) {
      at += 3;
      continue;
    }
    const head = readHead(source, at);
    if (!head) {
      at += 3;
      continue;
    }
    const definition = known.get(head.name);
    if (!definition) {
      diagnostics.push({
        from: at,
        to: head.to,
        message: `未注册短代码：${head.name}`,
      });
      at = head.to;
      continue;
    }
    if (head.close) {
      const top = stack.at(-1);
      if (top?.name === head.name && !head.error) {
        top.to = head.to;
        top.bodyTo = at;
        stack.pop();
        (stack.at(-1)?.children ?? nodes).push(top);
      } else
        diagnostics.push({
          from: at,
          to: head.to,
          message: `结束标记不匹配：${head.name}`,
        });
    } else {
      const node: ShortcodeNode = {
        from: at,
        to: head.to,
        name: head.name,
        attributes: head.attributes,
        children: [],
        bodyFrom: head.to,
        bodyTo: head.to,
        error: head.error,
      };
      if (stack.length >= 32)
        diagnostics.push({
          from: at,
          to: head.to,
          message: "短代码嵌套超过 32 层",
        });
      else if (definition.kind === "container") stack.push(node);
      else (stack.at(-1)?.children ?? nodes).push(node);
      if (head.error)
        diagnostics.push({ from: at, to: head.to, message: head.error });
    }
    at = head.to;
  }
  for (const node of stack)
    diagnostics.push({
      from: node.from,
      to: node.to,
      message: `缺少结束标记：${node.name}`,
    });
  return { nodes, diagnostics };
}

export function shortcodeCall(
  definition: Pick<PublicShortcode, "name" | "kind" | "parameters">,
  values: Record<string, string> = {},
  body = "",
) {
  const attributes = definition.parameters
    .map(
      (parameter) =>
        ` ${parameter.name}=${JSON.stringify(values[parameter.name] ?? parameter.default ?? "")}`,
    )
    .join("");
  const head = `{{< ${definition.name}${attributes} >}}`;
  return definition.kind === "container"
    ? `${head}\n${body}\n{{< /${definition.name} >}}`
    : head;
}
