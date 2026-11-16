export function hexColor(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const text = value.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(text)) return text;
  if (/^#[\da-f]{3}$/.test(text))
    return `#${Array.from(text.slice(1), (digit) => digit + digit).join("")}`;
}

export type HsvColor = { hue: number; saturation: number; value: number };

export function rgbChannels(hex: string) {
  return [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
}

export function rgbHex(channels: readonly number[]) {
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToHsv(hex: string): HsvColor {
  const [red, green, blue] = rgbChannels(hex).map((channel) => channel / 255);
  const value = Math.max(red, green, blue);
  const difference = value - Math.min(red, green, blue);
  let angle = 0;
  if (difference > 0) {
    if (value === red) angle = (green - blue) / difference;
    else if (value === green) angle = (blue - red) / difference + 2;
    else angle = (red - green) / difference + 4;
  }
  return {
    hue: (angle * 60 + 360) % 360,
    saturation: value ? difference / value : 0,
    value,
  };
}

export function hsvToHex({ hue, saturation, value }: HsvColor) {
  return rgbHex(
    [5, 3, 1].map((offset) => {
      const phase = (offset + hue / 60) % 6;
      const intensity =
        value * (1 - saturation * Math.max(0, Math.min(phase, 4 - phase, 1)));
      return Math.round(255 * intensity);
    }),
  );
}
