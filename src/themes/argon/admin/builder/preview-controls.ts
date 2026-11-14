const sourceComponent =
  '[data-builder-node="core.html"],[data-builder-node="core.markdown"],[data-builder-node="core.shortcode"]';
const nativePreviewControl =
  "details > summary, audio[controls], video[controls]";

/** Native controls in the sanitized output should behave like reader controls. */
export function isBuilderPreviewControl(target: Element | null) {
  if (target?.closest?.("a[href], button, input, select, textarea, form"))
    return false;
  const control = target?.closest?.(nativePreviewControl);
  const output = control?.closest(
    "[data-builder-inline-rendered], [data-builder-inline-output], [data-content-features]",
  );
  return Boolean(output?.closest(sourceComponent));
}
