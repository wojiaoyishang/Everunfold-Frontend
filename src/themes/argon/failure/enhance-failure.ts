import type { createPairGame } from "./pair-game";

/** Only owns this widget's DOM. No network, storage or dependency on the blog shell. */
export function enhanceFailure(
  root: HTMLElement,
  createGame: typeof createPairGame,
  retry: () => void = () => window.location.reload(),
) {
  const game = createGame();
  const panel = root.querySelector<HTMLElement>(".failure-game")!;
  const cards = Array.from(
    panel.querySelectorAll<HTMLButtonElement>("[data-card]"),
  );
  const start = panel.querySelector<HTMLButtonElement>("[data-restart]")!;
  const message = panel.querySelector<HTMLElement>("[data-game-message]")!;
  const score = panel.querySelector<HTMLElement>("[data-game-score]")!;
  const fireworks = panel.querySelector<HTMLElement>(".ui-fireworks")!;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const labels = ["星星", "月亮", "叶子", "爱心"];
  function render() {
    const state = game.snapshot();
    cards.forEach((card, index) => {
      const matched = state.matched.includes(index);
      const visible = matched || state.revealed.includes(index);
      card.dataset.face = String(state.deck[index]);
      card.dataset.revealed = String(visible);
      card.dataset.matched = String(matched);
      card.disabled = false;
      card.setAttribute("aria-disabled", String(visible || state.pending));
      card.setAttribute(
        "aria-label",
        `第 ${index + 1} 张，${visible ? labels[state.deck[index]] + (matched ? "，已配对" : "") : "未翻开"}`,
      );
    });
    score.textContent = `${state.matched.length / 2} / 4 组 · ${state.moves} 次尝试`;
    panel.dataset.complete = String(state.complete);
    fireworks.dataset.active = String(state.complete);
    message.textContent = state.complete
      ? `全部配对成功，用了 ${state.moves} 次尝试。`
      : state.pending
        ? "这两张不同，记住它们的位置。"
        : state.revealed.length
          ? "再翻一张，找出相同图案。"
          : "找出 4 组相同图案，不计时。";
  }
  panel.dataset.gameReady = "true";
  start.disabled = false;
  root
    .querySelector<HTMLButtonElement>("[data-retry]")
    ?.removeAttribute("hidden");
  root.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>("button")
          : null;
      if (!target || !root.contains(target)) return;
      if (target.hasAttribute("data-retry")) {
        retry();
        return;
      }
      if (target === start) {
        clearTimeout(timer);
        game.restart();
        render();
        start.querySelector("span")!.textContent = "重新开始";
        cards[0].focus({ preventScroll: true });
      } else if (
        target.hasAttribute("data-card") &&
        target.getAttribute("aria-disabled") !== "true"
      ) {
        const state = game.flip(Number(target.dataset.card));
        render();
        if (state.pending)
          timer = setTimeout(() => {
            game.conceal();
            render();
          }, 950);
      }
    },
    { signal: controller.signal },
  );
  return () => {
    controller.abort();
    clearTimeout(timer);
    delete panel.dataset.gameReady;
    fireworks.dataset.active = "false";
  };
}
