type HandoffOptions = {
  feedback: Pick<HTMLElement, "animate">;
  card: Pick<HTMLElement, "animate">;
  animated: boolean;
  onLeaving: () => void;
  navigate: () => void;
};

/** Wait for real animation completion; cancellation and missing animation events stay bounded. */
export function startLoginHandoff({
  feedback,
  card,
  animated,
  onLeaving,
  navigate,
}: HandoffOptions): () => void {
  const lifetime = new AbortController();
  const animations = new Set<Animation>();

  function step(
    element: Pick<HTMLElement, "animate">,
    frames: Keyframe[],
    duration: number,
  ) {
    return new Promise<void>((resolve) => {
      let settled = false;
      let animation: Animation | undefined;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        lifetime.signal.removeEventListener("abort", finish);
        // Complete a paused/non-settling effect before advancing to the next stage.
        if (!lifetime.signal.aborted && animation?.playState !== "finished") {
          try {
            animation?.finish();
          } catch {
            /* The fallback still completes. */
          }
        }
        resolve();
      };
      const timer = setTimeout(finish, duration + (animated ? 200 : 0));
      lifetime.signal.addEventListener("abort", finish, { once: true });
      if (animated) {
        try {
          animation = element.animate(frames, {
            duration,
            easing: "cubic-bezier(.2,.65,.3,1)",
            fill: "forwards",
          });
          animations.add(animation);
          void animation.finished.then(finish, finish);
        } catch {
          /* Older browsers still show success for the bounded interval. */
        }
      }
    });
  }

  void (async () => {
    await step(
      feedback,
      [
        { opacity: 0, transform: "translateY(8px)", offset: 0 },
        { opacity: 1, transform: "none", offset: 0.35 },
        { opacity: 1, transform: "none", offset: 1 },
      ],
      animated ? 1000 : 450,
    );
    if (lifetime.signal.aborted) return;
    onLeaving();
    if (animated)
      await step(
        card,
        [
          { opacity: 1, transform: "none" },
          // Keep the confirmation readable if the destination route takes longer to load.
          { opacity: 0.85, transform: "translateY(-6px) scale(.99)" },
        ],
        220,
      );
    if (!lifetime.signal.aborted) navigate();
  })();

  return () => {
    lifetime.abort();
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
}
