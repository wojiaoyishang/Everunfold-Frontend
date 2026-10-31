/** Inline styles also travel with the snapshot-independent error document. */
export const celebrationFireworksStyles = `
.ui-fireworks {
  --firework-radius: clamp(36px, 7vw, 86px);
  position: absolute; inset: 0; z-index: 2;
  overflow: hidden; overflow: clip; border-radius: inherit;
  pointer-events: none; user-select: none;
  color: var(--celebration-color, var(--accent));
}
.ui-fireworks:not([data-active="true"]) { display: none; }
/* The first burst is immediate; the next two retain their short launch trails. */
.ui-fireworks-burst { position: absolute; left: 24%; top: 32%; --burst-delay: -380ms; }
.ui-fireworks-burst:nth-of-type(2) { left: 76%; top: 26%; --burst-delay: 120ms; color: color-mix(in srgb, currentColor 62%, #f4bb6a); }
.ui-fireworks-burst:nth-of-type(3) { left: 50%; top: 64%; --burst-delay: 400ms; }
.ui-fireworks-burst::before, .ui-fireworks-burst::after, .ui-fireworks-spark {
  content: ""; position: absolute; left: 0; top: 0; opacity: 0;
}
.ui-fireworks-burst::before { width: 2px; height: 18px; border-radius: 3px; background: linear-gradient(transparent, currentColor); }
.ui-fireworks-burst::after { width: 18px; height: 18px; border: 1px solid currentColor; border-radius: 50%; }
.ui-fireworks-spark { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px color-mix(in srgb, currentColor 48%, transparent); }
.ui-fireworks-spark:nth-child(3n) { width: 3px; height: 7px; }
.ui-fireworks[data-active="true"] .ui-fireworks-spark { animation: ui-firework-spark 1800ms var(--burst-delay) cubic-bezier(.12,.65,.3,1) both; }
.ui-fireworks[data-active="true"] .ui-fireworks-burst::before { animation: ui-firework-launch 1800ms var(--burst-delay) ease-out both; }
.ui-fireworks[data-active="true"] .ui-fireworks-burst::after { animation: ui-firework-ring 1800ms var(--burst-delay) ease-out both; }
@keyframes ui-firework-launch {
  0% { opacity: 0; transform: translate(-50%, 75px) scaleY(.4); }
  8% { opacity: .7; }
  20% { opacity: .9; transform: translate(-50%, 0) scaleY(1); }
  24%, 100% { opacity: 0; transform: translate(-50%, -5px) scaleY(.2); }
}
@keyframes ui-firework-ring {
  0%, 20% { opacity: 0; transform: translate(-50%, -50%) scale(.2); }
  26% { opacity: .55; }
  60%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(4); }
}
@keyframes ui-firework-spark {
  0%, 20% { opacity: 0; transform: translate(-50%, -50%) scale(.15); }
  25% { opacity: 1; }
  65% { opacity: .85; transform: translate(calc(var(--spark-x) * var(--firework-radius) * .85), calc(var(--spark-y) * var(--firework-radius) * .85)) scale(var(--spark-scale)); }
  100% { opacity: 0; transform: translate(calc(var(--spark-x) * var(--firework-radius)), calc(var(--spark-y) * var(--firework-radius) + 26px)) scale(.15); }
}
html[data-motion="reduced"] .ui-fireworks { display: none; }
@media (prefers-reduced-motion: reduce) { html:not([data-motion="full"]) .ui-fireworks { display: none; } }
@media (forced-colors: active) { .ui-fireworks { display: none; } }
`;
