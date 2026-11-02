export interface SceneShortcut {
  key: string;
  shift?: boolean | "any";
  run: () => void;
}
export interface SceneKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  defaultPrevented: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

/** Only registered scene keys replace browser defaults; held/composing keys never repeat writes. */
export function dispatchSceneShortcut(
  event: SceneKeyEvent,
  bindings: readonly SceneShortcut[],
  suspended = false,
) {
  if (
    event.defaultPrevented ||
    event.altKey ||
    (!event.ctrlKey && !event.metaKey)
  )
    return false;
  const binding = bindings.find(
    (item) =>
      item.key.toLowerCase() === event.key.toLowerCase() &&
      (item.shift === "any" || event.shiftKey === Boolean(item.shift)),
  );
  if (!binding) return false;
  event.preventDefault();
  event.stopPropagation();
  if (!suspended && !event.repeat && !event.isComposing) binding.run();
  return true;
}
