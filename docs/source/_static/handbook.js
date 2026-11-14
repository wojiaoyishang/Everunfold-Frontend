document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".handbook-nav-toggle");
  const drawer = document.querySelector(".wy-nav-side");
  const close = document.querySelector(".handbook-nav-close");
  const backdrop = document.querySelector(".handbook-nav-backdrop");
  const content = document.querySelector(".wy-nav-content-wrap");
  const narrow = window.matchMedia("(max-width: 768px)");

  if (!toggle || !drawer || !close || !backdrop || !content) return;

  drawer.id ||= "handbook-navigation";
  toggle.setAttribute("aria-controls", drawer.id);

  function setOpen(open, restoreFocus = true) {
    document.body.classList.toggle("handbook-nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    content.inert = open;
    if (open) close.focus();
    else if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener("click", () => setOpen(true));
  close.addEventListener("click", () => setOpen(false));
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      setOpen(false);
    }
  });
  drawer.addEventListener("click", (event) => {
    if (!narrow.matches || event.target.closest("button")) return;
    const link = event.target.closest("a[href]");
    if (link && link.pathname === window.location.pathname && link.hash) {
      setOpen(false);
    }
  });
  narrow.addEventListener("change", () => {
    if (toggle.getAttribute("aria-expanded") === "true") setOpen(false, false);
  });
});
