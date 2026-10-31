/** Mount-only CSS: reshuffling/flipping cards does not restart the entrance. */
export const failureEntranceStyles = `
html[data-motion="full"] .failure-surface:not([data-entered="true"]) .failure-layout {
  animation: failure-panel-enter 760ms cubic-bezier(.22,1,.36,1) backwards;
}
html[data-motion="full"] .failure-surface:not([data-entered="true"]) .failure-copy {
  --section-entry-x: -14px;
  animation: failure-section-enter 680ms 110ms cubic-bezier(.22,1,.36,1) backwards;
}
html[data-motion="full"] .failure-surface:not([data-entered="true"]) .failure-game {
  --section-entry-x: 14px;
  animation: failure-section-enter 680ms 180ms cubic-bezier(.22,1,.36,1) backwards;
}
html[data-motion="full"] .failure-surface:not([data-entered="true"]) .failure-card {
  animation: failure-card-enter 560ms calc(270ms + var(--entry-order, 0) * 45ms) cubic-bezier(.22,1,.36,1) backwards;
}
@keyframes failure-panel-enter {
  from { opacity: 0; transform: translate3d(0, 22px, 0) scale(.98); }
  to { opacity: 1; transform: none; }
}
@keyframes failure-section-enter {
  from { opacity: 0; transform: translate3d(var(--section-entry-x, 0px), var(--section-entry-y, 0px), 0); }
  to { opacity: 1; transform: none; }
}
@keyframes failure-card-enter {
  from { opacity: 0; transform: translate3d(var(--entry-x, 0px), 18px, 0) rotate(var(--entry-turn, 0deg)) scale(.94); }
  to { opacity: 1; transform: none; }
}
@media (max-width: 700px) {
  html[data-motion="full"] .failure-surface:not([data-entered="true"]) :is(.failure-copy, .failure-game) { --section-entry-x: 0px; --section-entry-y: 10px; }
}
`;
