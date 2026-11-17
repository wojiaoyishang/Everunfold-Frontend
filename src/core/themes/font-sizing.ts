import parse from "postcss/lib/parse";
import list from "postcss/lib/list";

const absoluteLength =
  /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|pt|pc|cm|mm|in|q|[sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))$/i;
const relativeLength = /^(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|ch|cap|ic|lh|%)$/i;
const fontSizeFunction = /^(?:calc|var|clamp|min|max)\(/i;

/** Parent-relative sizes already follow the scaled size they inherit from. */
export function scaleFontSize(value: string): string {
  const size = value.trim();
  if (size.includes("--public-font-scale")) return value;
  if (!absoluteLength.test(size) && !fontSizeFunction.test(size)) return value;
  return `calc(${size} * var(--public-font-scale, 1))`;
}

export function scaleFontDeclaration(property: string, value: string): string {
  switch (property.toLowerCase()) {
    case "font-size":
      return scaleFontSize(value);
    case "font": {
      const parts = list.space(value);
      if (parts.length < 2) return value;
      for (const [index, part] of parts.entries()) {
        const [size] = list.split(part, ["/"], false);
        if (!size) continue;
        if (
          relativeLength.test(size) ||
          /^(?:xx?-|x-)?(?:small|large)$|^medium$|^(?:smaller|larger)$/i.test(
            size,
          )
        )
          return value;
        const scaled = scaleFontSize(size);
        if (scaled === size) continue;
        parts[index] = scaled + part.slice(size.length);
        return parts.join(" ");
      }
      return value;
    }
    default:
      return value;
  }
}

/** Apply the public typography convention to separately built extension sheets. */
export function scaleStylesheetFonts(css: string): string {
  const sheet = parse(css);
  sheet.walkDecls((declaration) => {
    const { prop, value } = declaration;
    declaration.value = scaleFontDeclaration(prop, value);
  });
  return sheet.toString();
}
