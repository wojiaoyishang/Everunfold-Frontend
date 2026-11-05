/** Wait for the replacement view and its internal scroller, then avoid the sticky chrome. */
export function revealEditorSelection(
  root: HTMLElement,
  caret: () => { top: number; bottom: number } | null,
) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (!root.isConnected || !root.contains(document.activeElement)) return;
      const rect = caret();
      if (!rect) return;
      const shell = root.closest(".admin-shell");
      const nav =
        shell?.querySelector(".admin-header")?.getBoundingClientRect().bottom ??
        0;
      const dock =
        shell
          ?.querySelector("[data-admin-header-dock]")
          ?.getBoundingClientRect().bottom ?? 0;
      const header =
        root
          .closest("[data-block-id]")
          ?.querySelector("[data-editor-block-header]")
          ?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(nav, dock, header) + 20;
      const bottom = window.innerHeight - 32;
      if (rect.top < top || rect.bottom > bottom)
        window.scrollBy({
          top: rect.top - Math.min(top + 72, bottom - 32),
          behavior: "instant",
        });
    }),
  );
}
