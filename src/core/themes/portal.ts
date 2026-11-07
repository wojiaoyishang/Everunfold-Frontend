/** Keep native top-layer dialogs inside the active surface so scoped theme CSS inherits. */
export function surfacePortalTarget(): Element {
  return (
    document.querySelector(".admin-root") ??
    document.querySelector("[data-public-theme]") ??
    document.body
  );
}
