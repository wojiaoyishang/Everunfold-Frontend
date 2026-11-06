import type { PageValue } from "@/core/contracts/pages";

export function parsePageConfiguration(source: string): {
  value: NonNullable<PageValue["options"]> | null;
  error: string;
} {
  try {
    const value: unknown = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("页面配置须为 JSON 对象。");
    const pending: [unknown, number][] = [[value, 0]];
    while (pending.length) {
      const [item, depth] = pending.pop()!;
      if (depth > 32) throw new Error("页面配置最多支持 32 层嵌套。");
      if (typeof item === "number" && !Number.isFinite(item))
        throw new Error("页面配置中的数字必须为有限值。");
      if (item && typeof item === "object")
        pending.push(
          ...Object.values(item).map((v): [unknown, number] => [v, depth + 1]),
        );
    }
    if (new TextEncoder().encode(JSON.stringify(value)).length > 256 * 1024)
      throw new Error("页面配置不能超过 256 KiB。");
    return { value: value as NonNullable<PageValue["options"]>, error: "" };
  } catch (error) {
    return {
      value: null,
      error:
        error instanceof SyntaxError
          ? "JSON 格式无效，请检查引号、逗号和括号。"
          : (error as Error).message,
    };
  }
}
