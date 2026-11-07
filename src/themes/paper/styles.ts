/** Trusted source CSS, emitted only when Paper belongs to the active public chain. */
const css = `
.public-theme[data-theme-chain~="paper"] { --paper-radius: 16px; }
.public-theme[data-theme-chain~="paper"] .surface { border-radius: var(--paper-radius); }
.public-theme[data-theme-chain~="paper"] .paper-hero .hero { height: auto; min-height: 210px; max-height: none; padding-block: 62px 42px; }
.public-theme[data-theme-chain~="paper"] .paper-hero .hero-copy { position: static; padding-top: 0; }
.public-theme[data-theme-chain~="paper"] .blog-container { margin-top: 0; }
.public-theme[data-theme-chain~="paper"] .hero-title { letter-spacing: .06em; }
.public-theme[data-theme-chain~="paper"] .article-content { line-height: 1.95; }
.public-theme[data-theme-chain~="paper"] .article-header:not(.has-cover) { border-bottom: 1px solid var(--line); }
.public-theme[data-theme-chain~="paper"] [data-theme-page="core.people"] .paper-people { padding: 12px; border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); border-radius: var(--paper-radius); }
.public-theme[data-theme-chain~="paper"] .paper-footer-note { margin: -18px auto 28px; text-align: center; font-size: 12px; color: var(--muted); }
@media (max-width: 600px) {
  .public-theme[data-theme-chain~="paper"] .paper-hero .hero { min-height: 210px; padding-block: 100px 32px; }
  .public-theme[data-theme-chain~="paper"] [data-theme-page="core.people"] .paper-people { padding: 6px; }
}
`;

export default css;
