/** Finish a dialog exit once, including reduced motion and interrupted animations. */
export function afterDialogMotion(
  element: Pick<HTMLElement, "getAnimations"> | null,
  complete: () => void,
  maxWait = 500,
): () => void {
  let active = true;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    active = false;
    clearTimeout(deadline);
  };
  const finish = () => {
    if (!active) return;
    cancel();
    complete();
  };
  try {
    // Descendant spinners must never keep a closing dialog mounted.
    const animations =
      element
        ?.getAnimations()
        .filter(
          (animation) =>
            animation.playState !== "finished" &&
            animation.playState !== "idle" &&
            animation.effect?.getComputedTiming().endTime !== Infinity,
        ) ?? [];
    if (!animations.length) {
      queueMicrotask(finish);
    } else {
      deadline = setTimeout(finish, maxWait);
      // A preference change may cancel CSS motion; that also completes the exit.
      void Promise.allSettled(
        animations.map((animation) => animation.finished),
      ).then(finish);
    }
  } catch {
    // Older browsers may lack getAnimations; still allow the CSS exit to play.
    deadline = setTimeout(finish, maxWait);
  }
  return cancel;
}
