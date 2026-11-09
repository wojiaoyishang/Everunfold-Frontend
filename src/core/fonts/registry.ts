import type {
  FontDefinition,
  RegisteredFontFace,
  ThemeTypography,
} from "./types";

const identity = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const formats = ["woff2", "woff", "truetype", "opentype"];
const generic = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "cursive",
  "fantasy",
  "math",
  "emoji",
]);
export const isFontId = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 128 && identity.test(value);
export function fontSource(value: string, allowAsset = true): string | null {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2048 ||
    /[\u0000-\u0020\u007f<>"'\\{};]/.test(value)
  )
    return null;
  if (
    allowAsset &&
    /^asset:(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.(?:woff2?|ttf|otf)$/.test(
      value,
    ) &&
    !value.includes("..")
  )
    return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Themes and plugins use this same declaration API; there is no process-global mutable register. */
export function defineFont(
  value: FontDefinition,
  allowAsset = true,
): FontDefinition {
  if (
    !value ||
    !isFontId(value.id) ||
    typeof value.label !== "string" ||
    !value.label.trim() ||
    value.label.length > 120 ||
    (value.license !== undefined &&
      (typeof value.license !== "string" || value.license.length > 300))
  )
    throw new Error("Invalid font declaration");
  const fallbacks = value.fallbacks ?? ["sans-serif"];
  if (
    !Array.isArray(fallbacks) ||
    !fallbacks.length ||
    fallbacks.length > 16 ||
    fallbacks.some(
      (f) => typeof f !== "string" || !/^[\p{L}\p{N} ._-]{1,120}$/u.test(f),
    )
  )
    throw new Error(`Invalid font fallbacks: ${value.id}`);
  if (!Array.isArray(value.faces ?? []) || (value.faces?.length ?? 0) > 64)
    throw new Error(`Invalid font faces: ${value.id}`);
  const faces = (value.faces ?? []).map((face): RegisteredFontFace => {
    const src = fontSource(face.src, allowAsset),
      weight = face.weight ?? 400,
      style = face.style ?? "normal";
    const weights = typeof weight === "number" ? [weight, weight] : weight;
    if (
      !src ||
      !formats.includes(face.format) ||
      !Array.isArray(weights) ||
      weights.length !== 2 ||
      weights.some((w) => !Number.isInteger(w) || w < 1 || w > 1000) ||
      weights[0] > weights[1] ||
      !["normal", "italic", "oblique"].includes(style) ||
      (face.unicodeRange !== undefined &&
        (typeof face.unicodeRange !== "string" ||
          face.unicodeRange.length > 1024 ||
          !/^U\+[0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?(?:\s*,\s*U\+[0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?)*$/i.test(
            face.unicodeRange,
          )))
    )
      throw new Error(`Invalid font face: ${value.id}`);
    return Object.freeze({
      src,
      format: face.format,
      style,
      weight:
        typeof weight === "number"
          ? weight
          : (Object.freeze([...weight]) as readonly [number, number]),
      ...(face.unicodeRange ? { unicodeRange: face.unicodeRange } : {}),
    });
  });
  return Object.freeze({
    id: value.id,
    label: value.label.trim(),
    fallbacks: Object.freeze([...fallbacks]),
    faces: Object.freeze(faces),
    ...(value.license ? { license: value.license } : {}),
  });
}
export function registeredFontFamily(id: string) {
  return isFontId(id) ? `ef-registered-${id}` : null;
}
export function fontStack(font: FontDefinition): string {
  return [
    `"${registeredFontFamily(font.id)}"`,
    ...(font.fallbacks ?? ["sans-serif"]).map((f) =>
      generic.has(f) ? f : JSON.stringify(f),
    ),
  ].join(", ");
}
export function registeredFontCss(font: FontDefinition): string {
  const family = registeredFontFamily(font.id);
  if (!family) return "";
  return (font.faces ?? [])
    .filter((face) => !face.src.startsWith("asset:"))
    .map(
      (face) =>
        `@font-face{font-family:"${family}";src:url("${face.src}") format("${face.format}");font-style:${face.style ?? "normal"};font-weight:${typeof face.weight === "number" ? face.weight : (face.weight ?? [400, 400]).join(" ")};font-display:swap;${face.unicodeRange ? `unicode-range:${face.unicodeRange};` : ""}}`,
    )
    .join("\n");
}
export function createFontRegistry(
  definitions: readonly FontDefinition[],
  allowAsset = true,
) {
  const byId = new Map<string, FontDefinition>();
  for (const definition of definitions) {
    const font = defineFont(definition, allowAsset),
      previous = byId.get(font.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(font))
      throw new Error(`Conflicting font declaration: ${font.id}`);
    byId.set(font.id, font);
  }
  return Object.freeze({
    all: Object.freeze([...byId.values()]),
    get: (id: string) => byId.get(id),
    css: (ids: readonly string[]) =>
      [...new Set(ids)]
        .map((id) => (byId.has(id) ? registeredFontCss(byId.get(id)!) : ""))
        .filter(Boolean)
        .join("\n"),
  });
}
export function normalizeTypography(
  value: ThemeTypography = {},
): ThemeTypography {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) => !["body", "heading", "code"].includes(key),
    ) ||
    Object.values(value).some(
      (id) => id !== null && id !== undefined && !isFontId(id),
    )
  )
    throw new Error("Invalid theme typography");
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).filter(([, id]) => id !== undefined),
    ),
  );
}
export function inheritedTypography(
  chain: readonly { typography?: ThemeTypography }[],
): ThemeTypography {
  return Object.assign(
    {},
    ...[...chain].reverse().map((theme) => theme.typography ?? {}),
  );
}
