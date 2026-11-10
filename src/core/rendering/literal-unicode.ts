/**
 * htmlparser2 defaults to numeric entities for every non-ASCII code point,
 * and its "utf8" mode also writes literal angle brackets inside attributes.
 * Keep markup-significant ASCII escaped, but restore only non-ASCII text.
 */
export function literalUnicodeEntities(html: string) {
  return html.replace(
    /&#(?:x([0-9a-f]+)|([0-9]+));/gi,
    (entity, hexadecimal: string | undefined, decimal: string | undefined) => {
      const codePoint = Number.parseInt(
        hexadecimal ?? decimal ?? "",
        hexadecimal ? 16 : 10,
      );
      return Number.isSafeInteger(codePoint) &&
        codePoint >= 0x80 &&
        codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    },
  );
}
