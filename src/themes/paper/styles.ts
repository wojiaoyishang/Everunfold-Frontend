/** A paper palette and layout; controls, content and reader preferences stay inherited. */
const css = `
.public-theme[data-theme-chain~="paper"] {
  --surface: light-dark(#ffffff, #1d2025);
  --surface-soft: light-dark(#f5f5f4, #15171b);
  --line: light-dark(#dededc, #33373f);
  --text: light-dark(#44484f, #c7cbd2);
  --text-strong: light-dark(#282b30, #f1f2f4);
  --muted: light-dark(#777b80, #9ba2ae);
  --accent-soft: color-mix(in srgb, var(--accent) 7%, var(--surface));
  --shadow: none;
  color: var(--text);
}
[data-amoled="true"] .public-theme[data-theme-chain~="paper"] {
  --surface: light-dark(#ffffff, #08080b);
  --surface-soft: light-dark(#f5f5f4, #141419);
  --line: light-dark(#dededc, #25252b);
}

/* light-dark follows the inherited color-scheme, including the reader's system mode. */
.public-theme[data-theme-chain~="paper"] .page-background::after {
  background: var(--surface-soft);
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
.public-theme[data-theme-chain~="paper"] .icon-button:hover {
  background: var(--accent-soft);
}
.public-theme[data-theme-chain~="paper"] .header-inner,
.public-theme[data-theme-chain~="paper"] .blog-container {
  max-width: 1180px;
}
.public-theme[data-theme-chain~="paper"] .site-brand {
  font-size: 20px;
  font-weight: 600;
}
.public-theme[data-theme-chain~="paper"] .list-heading,
.public-theme[data-theme-chain~="paper"] .list-heading > span:last-child,
.public-theme[data-theme-chain~="paper"] .pagination-ellipsis,
.public-theme[data-theme-chain~="paper"] .site-footer,
.public-theme[data-theme-chain~="paper"] .site-footer p:last-child {
  color: var(--muted);
}
.public-theme[data-theme-chain~="paper"] .sidebar-menu-card,
.public-theme[data-theme-chain~="paper"] .sidebar-overview {
  background: var(--surface);
}
.public-theme[data-theme-chain~="paper"] .sidebar-banner {
  min-height: 0;
  padding: 24px 18px;
  border-bottom: 1px solid var(--line);
  background: none;
  color: var(--text-strong);
}

/* Compact banner and normal document flow, without replacing the parent component. */
.public-theme[data-theme-chain~="paper"] .hero {
  color: var(--text);
  height: auto;
  min-height: 0;
  max-height: none;
  max-width: 1180px;
  margin-inline: auto;
  padding: calc(var(--header-height) + 48px) 25px 44px;
  text-align: start;
}
.public-theme[data-theme-chain~="paper"] .hero-copy {
  position: static;
  padding: 0;
}
.public-theme[data-theme-chain~="paper"] .hero-title {
  font-size: clamp(26px, 3vw, 36px);
  text-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .hero-subtitle {
  color: var(--muted);
  letter-spacing: 0;
}
.public-theme[data-theme-chain~="paper"] .blog-container {
  margin-top: 0;
  gap: 28px;
  grid-template-columns: minmax(0, 1fr) 264px;
  grid-template-areas: "main sidebar";
}
.public-theme[data-theme-chain~="paper"] .main-column {
  grid-area: main;
}
.public-theme[data-theme-chain~="paper"] .site-sidebar {
  grid-area: sidebar;
}
.public-theme[data-theme-chain~="paper"] .sidebar-overview {
  margin-top: 0;
}
.public-theme[data-theme-chain~="paper"] .profile-avatar {
  box-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .avatar-placeholder {
  width: 72px;
  height: 72px;
  color: var(--muted);
  background: var(--surface-soft);
}
.public-theme[data-theme-chain~="paper"] .sidebar-tabs button[aria-selected="true"] {
  color: var(--text-strong);
  background: var(--surface-soft);
  box-shadow: none;
  font-weight: 600;
}
@media (min-width: 901px) {
  .public-theme[data-theme-chain~="paper"] .sidebar-menu-card {
    display: none;
  }
}

/* Images and headings have their own space; no text overlay is needed. */
.public-theme[data-theme-chain~="paper"] .surface {
  border: 1px solid var(--line);
}
.public-theme[data-theme-chain~="paper"] .post-card:hover {
  transform: translateY(-2px);
  box-shadow: none;
  border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
}
.public-theme[data-theme-chain~="paper"] .post-cover {
  height: auto;
  color: var(--text);
}
.public-theme[data-theme-chain~="paper"] .post-cover-image {
  position: relative;
  height: clamp(150px, 22vw, 240px);
}
.public-theme[data-theme-chain~="paper"] .post-cover-image::after,
.public-theme[data-theme-chain~="paper"] .article-cover::after {
  display: none;
}
.public-theme[data-theme-chain~="paper"] .post-cover-heading {
  position: static;
  padding: 26px 30px 0;
  text-align: start;
}
.public-theme[data-theme-chain~="paper"] .post-cover-heading .post-title-row,
.public-theme[data-theme-chain~="paper"] .post-cover-heading .post-meta {
  justify-content: flex-start;
}
.public-theme[data-theme-chain~="paper"] .post-title,
.public-theme[data-theme-chain~="paper"] .post-cover-heading .post-title {
  color: var(--text-strong);
  font-size: clamp(20px, 2vw, 24px);
  font-weight: 600;
  text-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .post-cover-heading .post-meta {
  color: var(--muted);
  opacity: 1;
  text-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .post-cover-heading .pinned-badge,
.public-theme[data-theme-chain~="paper"] .post-cover-heading a:hover,
.public-theme[data-theme-chain~="paper"] .post-card:hover .post-title {
  color: var(--accent);
  text-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .post-card-body {
  padding: 26px 30px;
}
.public-theme[data-theme-chain~="paper"] .post-excerpt {
  margin: 18px 0 22px;
  line-height: 1.85;
  -webkit-line-clamp: 3;
}
.public-theme[data-theme-chain~="paper"] .has-cover .post-card-body {
  padding-top: 0;
}

/* Reading preferences, code/formula rendering and plugins still come from Argon. */
.public-theme[data-theme-chain~="paper"] .article-header,
.public-theme[data-theme-chain~="paper"] .article-header.has-cover {
  display: block;
  min-height: 0;
  text-align: start;
  color: var(--text);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.public-theme[data-theme-chain~="paper"] .article-cover {
  position: relative;
  height: clamp(170px, 26vw, 290px);
  z-index: 0;
}
.public-theme[data-theme-chain~="paper"] .article-heading,
.public-theme[data-theme-chain~="paper"] .article-body {
  padding: 32px clamp(20px, 4vw, 46px);
}
.public-theme[data-theme-chain~="paper"] .article-header h1 {
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 600;
  color: var(--text-strong);
  text-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .article-header .post-meta,
.public-theme[data-theme-chain~="paper"] .article-header .post-meta .icon {
  color: var(--muted);
}
.public-theme[data-theme-chain~="paper"] .article-header .post-meta,
.public-theme[data-theme-chain~="paper"] .article-categories {
  justify-content: flex-start;
}
.public-theme[data-theme-chain~="paper"] .article-header .article-categories a {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--line);
}
.public-theme[data-theme-chain~="paper"] .article-content {
  line-height: 1.85;
}
.public-theme[data-theme-chain~="paper"] .article-content :is(h1, h2, h3) {
  padding-left: 0;
  font-weight: 600;
}
.public-theme[data-theme-chain~="paper"] .article-content :is(h1, h2, h3)::before {
  display: none;
}

/* Related reading stays typographic instead of using image/gradient overlays. */
.public-theme[data-theme-chain~="paper"] .neighbor-card .story-cover,
.public-theme[data-theme-chain~="paper"] .related-card .story-cover {
  display: none;
}
.public-theme[data-theme-chain~="paper"] .neighbor-card,
.public-theme[data-theme-chain~="paper"] .related-card {
  color: var(--text-strong);
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .neighbor-card small,
.public-theme[data-theme-chain~="paper"] .related-arrow {
  color: var(--muted);
}
.public-theme[data-theme-chain~="paper"] .related-card {
  aspect-ratio: auto;
  min-height: 108px;
  padding: 16px 16px 36px;
}
.public-theme[data-theme-chain~="paper"] .related-card h3 {
  color: inherit;
  text-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .related-card:is(:hover, :focus-visible),
.public-theme[data-theme-chain~="paper"] .neighbor-card:is(:hover, :focus-visible) {
  color: var(--text-strong);
  background: var(--surface-soft);
  box-shadow: none;
  transform: none;
}

/* One small tool dock: quiet icons, shared outline, progress in the same surface. */
.public-theme[data-theme-chain~="paper"] .floating-tools {
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  width: 44px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--text-strong) 6%, transparent);
}
.public-theme[data-theme-chain~="paper"] .tool-slot {
  margin-top: 0;
}
.public-theme[data-theme-chain~="paper"] .floating-button {
  width: 36px;
  height: 38px;
  color: var(--muted);
  background: transparent;
  border-radius: 5px;
  box-shadow: none;
}
.public-theme[data-theme-chain~="paper"] .floating-button:is(:hover, :focus-visible) {
  color: var(--text-strong);
  background: var(--surface-soft);
  transform: none;
}
.public-theme[data-theme-chain~="paper"] .floating-button:hover > .icon {
  transform: none;
}
.public-theme[data-theme-chain~="paper"] .reading-progress {
  height: 28px;
  color: var(--muted);
  background: transparent;
  box-shadow: none;
  font-size: 10px;
  font-weight: 500;
}
.public-theme[data-theme-chain~="paper"] .reading-progress::before {
  background: color-mix(in srgb, var(--muted) 12%, var(--surface));
}
.public-theme[data-theme-chain~="paper"] .reading-progress::after {
  height: 2px;
  background: var(--muted);
}
.public-theme[data-theme-chain~="paper"] .reading-settings {
  inset: auto 76px 18px auto;
  max-height: calc(100dvh - 40px);
  border: 1px solid var(--line);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--text-strong) 12%, transparent);
}

@media (max-width: 900px) {
  .public-theme[data-theme-chain~="paper"] .floating-tools {
    display: flex;
    width: auto;
    max-width: calc(100vw - 24px);
    padding: 2px;
    right: max(12px, env(safe-area-inset-right));
  }
  .public-theme[data-theme-chain~="paper"] .tool-slot {
    width: 44px;
    flex: 0 0 auto;
    transition: width 250ms ease, opacity 200ms ease;
  }
  .public-theme[data-theme-chain~="paper"] .tool-slot[data-visible="false"] {
    width: 0;
    grid-template-rows: 1fr;
    transform: none;
  }
  .public-theme[data-theme-chain~="paper"] .tool-slot-inner {
    min-width: 0;
  }
  .public-theme[data-theme-chain~="paper"] .floating-button {
    width: 44px;
    height: 44px;
  }
  .public-theme[data-theme-chain~="paper"] .reading-progress {
    width: 44px;
    height: 44px;
  }
  .public-theme[data-theme-chain~="paper"] .reading-settings {
    inset: auto 12px 78px auto;
    width: min(320px, calc(100% - 24px));
    max-height: calc(100dvh - 102px);
  }
  .public-theme[data-theme-chain~="paper"] .blog-shell {
    padding-bottom: calc(78px + env(safe-area-inset-bottom));
  }
}
@media (max-width: 640px) {
  .public-theme[data-theme-chain~="paper"] .site-brand {
    font-size: 16px;
  }
  .public-theme[data-theme-chain~="paper"] .blog-container {
    padding-inline: 12px;
  }
  .public-theme[data-theme-chain~="paper"] .hero {
    padding: calc(var(--header-height) + 24px) 18px 28px;
  }
  .public-theme[data-theme-chain~="paper"] .post-card-body {
    padding: 22px 20px;
  }
  .public-theme[data-theme-chain~="paper"] .post-cover-heading {
    padding: 22px 20px 0;
  }
  .public-theme[data-theme-chain~="paper"] .article-heading,
  .public-theme[data-theme-chain~="paper"] .article-body {
    padding: 24px 20px;
  }
}
`;

export default css;
