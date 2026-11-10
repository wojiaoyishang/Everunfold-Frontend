type ModernWriter = (text: string) => Promise<void>;
type LegacyWriter = (text: string) => boolean;

/** Try the standards API first, then the broadly available selection fallback. */
export async function copyTextWithFallback(
  text: string,
  modern: ModernWriter | undefined,
  legacy: LegacyWriter,
) {
  let modernError: unknown;
  if (modern) {
    try {
      await modern(text);
      return "clipboard" as const;
    } catch (error) {
      modernError = error;
    }
  }
  try {
    if (legacy(text)) return "fallback" as const;
  } catch {
    /* Both copy mechanisms failed. */
  }
  throw modernError instanceof Error
    ? modernError
    : new Error("浏览器不允许自动复制");
}

function legacyCopyText(text: string): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange(),
      )
    : [];
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;
  textarea.style.cssText =
    "position:fixed;inset:0 auto auto -9999px;opacity:0;pointer-events:none;";
  document.body.append(textarea);
  try {
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } finally {
    textarea.remove();
    active?.focus?.({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
  }
}

export function copyText(text: string) {
  return copyTextWithFallback(
    text,
    navigator.clipboard?.writeText?.bind(navigator.clipboard),
    legacyCopyText,
  );
}
