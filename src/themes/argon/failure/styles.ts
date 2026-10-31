/** Shared, scoped CSS is inlined so HTTP fallback pages never depend on a CSS chunk. */
export const failureStyles = `
html[data-failure-document] body { margin: 0; }
.failure-surface {
  --failure-accent: var(--accent, var(--custom-accent-light, #673bb7));
  --failure-brand: var(--brand-accent, var(--custom-accent-light, #673bb7));
  --failure-text: var(--text, #3d4050);
  --failure-muted: #737686;
  --failure-panel: var(--surface, color-mix(in srgb, var(--failure-brand) 4%, #fcfcfd));
  --failure-soft: var(--surface-soft, color-mix(in srgb, var(--failure-brand) 2%, #f8f9fc));
  --failure-line: color-mix(in srgb, var(--failure-accent) 15%, var(--failure-panel));
  box-sizing: border-box; min-height: 100svh; padding: 28px clamp(18px, 5vw, 72px) 24px;
  display: grid; align-items: center; color: var(--failure-text);
  font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background:
    radial-gradient(ellipse at 12% 45%, color-mix(in srgb, var(--failure-brand) 36%, transparent), transparent 52%),
    radial-gradient(ellipse at 92% 80%, color-mix(in srgb, var(--failure-brand) 22%, transparent), transparent 48%), #15162e;
  position: relative; isolation: isolate;
}
.failure-surface *, .failure-surface *::before, .failure-surface *::after { box-sizing: border-box; }
.failure-surface::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(circle at 22px 34px, #ffffff60 1px, transparent 1.6px) 0 0 / 191px 173px,
    radial-gradient(circle at 72px 96px, #ffffff30 1px, transparent 2px) 0 0 / 283px 251px;
  mask-image: linear-gradient(#000a, #0002);
}
.failure-wrap { width: min(1040px, 100%); margin: auto; }
.failure-topbar, .failure-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: #c9c7dc; }
.failure-topbar { margin-bottom: 40px; font-size: 12px; letter-spacing: .04em; }
.failure-surface .failure-brand { display: inline-flex; align-items: center; gap: 11px; font-size: 18px; font-weight: 600; color: #f5f2ff; text-decoration: none; }
.failure-brand > .icon { width: 30px; height: 30px; padding: 5px; background: #ffffff12; border: 1px solid #ffffff24; border-radius: 10px; }
.failure-layout { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 6vw, 72px); padding: clamp(26px, 4vw, 48px); border-radius: 22px; border: 1px solid #ffffff24; background: var(--failure-panel); box-shadow: 0 24px 90px #08071e38, 0 4px 20px #08071e20; }
.failure-copy { min-width: 0; align-self: center; }
.failure-art { height: 190px; width: 260px; max-width: 100%; position: relative; display: grid; place-items: center; color: var(--failure-accent); margin-bottom: 20px; }
.failure-code { position: relative; font-size: clamp(98px, 12vw, 132px); font-weight: 750; line-height: 1; letter-spacing: -.07em; font-variant-numeric: tabular-nums; background: linear-gradient(150deg, var(--failure-accent), color-mix(in srgb, var(--failure-accent) 36%, var(--failure-panel))); color: transparent; background-clip: text; }
.failure-orbit { position: absolute; width: 100%; height: 72%; border: 1px solid var(--failure-line); border-radius: 50%; transform: rotate(-26deg); }
.failure-orbit::before { content: ""; position: absolute; inset: 14px -8px; border: 1px dashed var(--failure-line); border-radius: inherit; transform: rotate(42deg); }
.failure-art > .icon { width: 36px; height: 36px; position: absolute; top: 2px; right: 6px; padding: 8px; background: var(--failure-panel); border: 1px solid var(--failure-line); border-radius: 50%; }
.failure-spark { position: absolute; bottom: 22px; left: 4px; width: 24px; height: 24px; background: var(--failure-panel); }
.failure-surface .icon { width: 1.2em; height: 1.2em; flex-shrink: 0; vertical-align: -.18em; }
.failure-surface .failure-art > .icon { width: 36px; height: 36px; }
.failure-eyebrow { font-size: 12px; letter-spacing: .14em; color: var(--failure-accent); margin: 0 0 7px; }
.failure-copy h1 { margin: 0; font-weight: 650; font-size: clamp(25px, 3.6vw, 32px); line-height: 1.4; letter-spacing: -.02em; color: var(--failure-text); }
.failure-description { margin: 15px 0 0; color: var(--failure-muted); font-size: 14px; max-width: 320px; line-height: 1.9; }
.failure-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 28px; }
.failure-surface button, .failure-actions a { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font: inherit; font-size: 14px; border: 1px solid var(--failure-line); border-radius: 9px; background: var(--failure-soft); color: var(--failure-accent); text-decoration: none; cursor: pointer; padding: 10px 17px; min-height: 44px; transition: background-color 180ms, transform 220ms, box-shadow 220ms; }
.failure-surface [hidden] { display: none !important; }
.failure-surface button:disabled { cursor: default; }
.failure-surface .failure-primary, .failure-surface .failure-start { background: var(--failure-brand); border-color: transparent; color: #fff; box-shadow: 0 5px 14px color-mix(in srgb, var(--failure-brand) 17%, transparent); }
.failure-surface button:not(:disabled):not([aria-disabled="true"]):hover, .failure-actions a:hover { transform: translateY(-2px); box-shadow: 0 6px 16px color-mix(in srgb, var(--failure-brand) 20%, transparent); }
.failure-surface button:focus-visible, .failure-surface a:focus-visible { outline: 2px solid var(--failure-accent); outline-offset: 4px; }
.failure-game { align-self: center; min-width: 0; padding-left: clamp(22px, 3vw, 38px); border-left: 1px solid var(--failure-line); }
.failure-game-heading { display: flex; align-items: center; gap: 12px; }
.failure-game-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; background: color-mix(in srgb, var(--failure-accent) 9%, var(--failure-panel)); color: var(--failure-accent); }
.failure-game-heading h2 { font-size: 19px; font-weight: 600; margin: 0; line-height: 1.5; color: var(--failure-text); }
.failure-game-heading p { margin: 3px 0 0; font-size: 12px; color: var(--failure-muted); }
.failure-game-meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 5px; margin: 26px 0 12px; color: var(--failure-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.failure-cards { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; --celebration-color: var(--failure-accent); }
.failure-surface .failure-card { position: relative; aspect-ratio: 4 / 5; width: 100%; min-height: 0; padding: 0; border: 0; border-radius: 10px; background: transparent; perspective: 600px; box-shadow: none; }
.failure-card-back, .failure-card-front { display: grid; place-items: center; position: absolute; inset: 0; border-radius: inherit; backface-visibility: hidden; transition: transform 420ms cubic-bezier(.22, 1, .36, 1), background-color 220ms, box-shadow 220ms; }
.failure-card-back { color: color-mix(in srgb, var(--failure-accent) 58%, var(--failure-panel)); border: 1px solid var(--failure-line); background: repeating-linear-gradient(135deg, transparent 0 8px, color-mix(in srgb, var(--failure-accent) 3%, transparent) 8px 9px), color-mix(in srgb, var(--failure-accent) 7%, var(--failure-panel)); }
.failure-card-back::after { content: ""; position: absolute; inset: 6px; border: 1px solid color-mix(in srgb, var(--failure-accent) 10%, transparent); border-radius: 6px; }
.failure-card-front { color: var(--failure-accent); background: var(--failure-soft); border: 1px solid var(--failure-line); transform: rotateY(-180deg); }
.failure-card[data-revealed="true"] .failure-card-back { transform: rotateY(180deg); }
.failure-card[data-revealed="true"] .failure-card-front { transform: rotateY(0); }
.failure-card .icon { width: 24px; height: 24px; }
.failure-card-front > [data-symbol] { display: none; }
.failure-card[data-face="0"] [data-symbol="0"], .failure-card[data-face="1"] [data-symbol="1"], .failure-card[data-face="2"] [data-symbol="2"], .failure-card[data-face="3"] [data-symbol="3"] { display: block; }
.failure-card-check { position: absolute; bottom: 3px; right: 5px; opacity: 0; }
.failure-card-check .icon { width: 12px; height: 12px; }
.failure-card[data-matched="true"] .failure-card-front { background: color-mix(in srgb, var(--failure-accent) 11%, var(--failure-panel)); border-color: color-mix(in srgb, var(--failure-accent) 35%, var(--failure-panel)); }
.failure-card[data-matched="true"] .failure-card-check { opacity: .75; }
.failure-game-message { min-height: 40px; margin: 17px 0 10px; font-size: 12px; color: var(--failure-muted); }
.failure-game[data-complete="true"] .failure-game-message { color: var(--failure-accent); }
.failure-surface .failure-start { width: 100%; }
.failure-game:not([data-game-ready]) .failure-start { display: none; }
.failure-game-note { font-size: 12px; color: var(--failure-muted); }
.failure-footer { margin-top: 24px; font-size: 11px; color: #a6a4bc; }
.failure-surface[data-embedded="true"] { min-height: auto; padding: 0; background: transparent; }
.failure-surface[data-embedded="true"]::before, .failure-surface[data-embedded="true"] .failure-topbar { display: none; }
.failure-surface[data-embedded="true"] .failure-layout { gap: 28px; padding: 28px; }
html[data-theme="dark"] .failure-surface { --failure-accent: var(--accent, var(--custom-accent-dark, #b895f2)); --failure-panel: var(--surface, color-mix(in srgb, var(--failure-accent) 8%, #1d2028)); --failure-soft: var(--surface-soft, color-mix(in srgb, var(--failure-accent) 12%, #22252e)); --failure-text: var(--text, #e4dfef); --failure-muted: #b0aabc; }
html[data-theme="dark"][data-amoled="true"] .failure-surface { --failure-panel: #08080b; --failure-soft: #141419; }
@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) .failure-surface { --failure-accent: var(--accent, var(--custom-accent-dark, #b895f2)); --failure-panel: var(--surface, color-mix(in srgb, var(--failure-accent) 8%, #1d2028)); --failure-soft: var(--surface-soft, color-mix(in srgb, var(--failure-accent) 12%, #22252e)); --failure-text: var(--text, #e4dfef); --failure-muted: #b0aabc; }
  html:not([data-theme="light"])[data-amoled="true"] .failure-surface { --failure-panel: #08080b; --failure-soft: #141419; }
}
@media (max-width: 700px) {
  .failure-surface { padding: 22px 16px; }
  .failure-topbar { margin-bottom: 24px; }
  .failure-topbar > span { display: none; }
  .failure-layout, .failure-surface[data-embedded="true"] .failure-layout { grid-template-columns: 1fr; gap: 28px; padding: 24px; border-radius: 16px; }
  .failure-art { height: 136px; width: 218px; margin: 0 auto 20px; }
  .failure-copy { text-align: center; }
  .failure-copy h1 { font-size: 24px; }
  .failure-description { margin: 12px auto 0; }
  .failure-actions { margin-top: 21px; justify-content: center; }
  .failure-game { border-left: 0; border-top: 1px solid var(--failure-line); padding: 24px 0 0; }
  .failure-cards { gap: 8px; }
  .failure-footer { font-size: 10px; gap: 8px; }
}
html[data-motion="reduced"] .failure-surface *, html[data-motion="reduced"] .failure-surface *::after { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-motion="full"]) .failure-surface *, html:not([data-motion="full"]) .failure-surface *::after { transition: none !important; }
}
@media (forced-colors: active) {
  .failure-code { color: CanvasText; background: none; }
  .failure-surface .failure-card-back, .failure-surface .failure-card-front { border: 1px solid ButtonText; }
}
`;
