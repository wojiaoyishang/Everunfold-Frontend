export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function moveOption(
  options: readonly SelectOption[],
  current: number,
  direction: 1 | -1,
) {
  if (current < 0 && direction === -1) current = 0;
  for (let step = 1; step <= options.length; step++) {
    const index =
      (current + direction * step + options.length) % options.length;
    if (!options[index].disabled) return index;
  }
  return -1;
}

export function matchOption(
  options: readonly SelectOption[],
  query: string,
  current: number,
) {
  const needle = query.toLocaleLowerCase();
  for (let step = 1; step <= options.length; step++) {
    const index = (current + step + options.length) % options.length;
    if (
      !options[index].disabled &&
      options[index].label.toLocaleLowerCase().startsWith(needle)
    )
      return index;
  }
  return current;
}

export function placePopover(
  anchor: { left: number; top: number; bottom: number; width: number },
  viewport: { width: number; height: number },
  desired: { width: number; height: number },
) {
  const margin = 12;
  const gap = 7;
  const width = Math.min(
    Math.max(anchor.width, desired.width),
    Math.max(0, viewport.width - margin * 2),
  );
  const below = Math.max(0, viewport.height - anchor.bottom - gap - margin);
  const above = Math.max(0, anchor.top - gap - margin);
  const upward = below < desired.height && above > below;
  const maxHeight = Math.min(320, upward ? above : below);
  const height = Math.min(desired.height, maxHeight);
  return {
    left: Math.max(
      margin,
      Math.min(anchor.left, viewport.width - width - margin),
    ),
    top: upward
      ? Math.max(margin, anchor.top - height - gap)
      : anchor.bottom + gap,
    width,
    maxHeight,
  };
}
