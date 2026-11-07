/** Keep changes scoped to this theme; colors and reading preferences come from Argon. */
const css = `
.public-theme[data-theme-chain~="paper"] {
  --shadow: none;
}

/* A quiet backdrop and plain navigation, using the parent's light/dark palette. */
.public-theme[data-theme-chain~="paper"] .page-background::after {
  background: color-mix(in srgb, var(--surface-soft) 94%, transparent);
}
.public-theme[data-theme-chain~="paper"] .site-header {
  color: var(--text);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  box-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .mobile-sidebar-button {
  color: inherit;
}
.public-theme[data-theme-chain~="paper"] .site-footer,
.public-theme[data-theme-chain~="paper"] .site-footer p:last-child {
  color: var(--text);
}

/* Compact banner and normal document flow, without replacing the parent component. */
.public-theme[data-theme-chain~="paper"] .hero {
  color: var(--text);
  height: auto;
  min-height: 0;
  max-height: none;
  padding: calc(var(--header-height) + 40px) 24px 32px;
}
.public-theme[data-theme-chain~="paper"] .hero-copy {
  position: static;
  padding: 0;
}
.public-theme[data-theme-chain~="paper"] .hero-title {
  font-size: clamp(24px, 3vw, 32px);
  text-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .blog-container {
  margin-top: 0;
  gap: 24px;
}

/* Flat cards and comfortable text; the parent handles responsive layouts and controls. */
.public-theme[data-theme-chain~="paper"] .surface {
  border: 1px solid var(--line);
}
.public-theme[data-theme-chain~="paper"] .article-content {
  line-height: 1.85;
}
`;

export default css;
