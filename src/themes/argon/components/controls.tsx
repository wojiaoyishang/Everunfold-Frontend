"use client";

import { Icon } from "./icon";

export function ThemeToggle() {
  function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const isDark = current
      ? current === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem("everunfold.theme", next);
    } catch {
      /* Preferences are optional. */
    }
  }
  return (
    <button
      className="icon-button"
      type="button"
      onClick={toggleTheme}
      aria-label="切换深浅色外观"
      title="切换深浅色外观"
    >
      <Icon name="sun" className="theme-sun" />
      <Icon name="moon" className="theme-moon" />
    </button>
  );
}

export function BackToTop() {
  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="返回顶部"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        })
      }
    >
      <Icon name="up" />
    </button>
  );
}
