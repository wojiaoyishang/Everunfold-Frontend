export type ThemeMode = "system" | "light" | "dark";
export interface Appearance {
  mode: ThemeMode;
  amoled: boolean;
  accent: string;
}
export const APPEARANCE_KEY = "everunfold.appearance.v1";
export const defaultAppearance: Appearance = {
  mode: "system",
  amoled: false,
  accent: "#673bb7",
};
export function appearance(value: unknown, legacy?: unknown): Appearance {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const mode = raw.mode ?? legacy;
  return {
    mode: mode === "light" || mode === "dark" ? mode : "system",
    amoled: raw.amoled === true,
    accent:
      typeof raw.accent === "string" && /^#[\da-f]{6}$/i.test(raw.accent)
        ? raw.accent.toLowerCase()
        : "#673bb7",
  };
}

/** Derive readable text accents against the theme surfaces, including very pale inputs. */
export function readableAccent(color: string, dark: boolean): string {
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(color.slice(offset, offset + 2), 16),
  );
  const luminance = (values: number[]) =>
    values
      .map((n) => n / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
      .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  const background = luminance(dark ? [36, 33, 50] : [245, 241, 251]);
  let result = rgb;
  for (let step = 0; step <= 20; step++) {
    result = rgb.map((value) =>
      Math.round(value + (((dark ? 255 : 0) - value) * step) / 20),
    );
    const foreground = luminance(result);
    if (
      (Math.max(background, foreground) + 0.05) /
        (Math.min(background, foreground) + 0.05) >=
      4.5
    )
      break;
  }
  return `#${result.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

// Cached derived colors are validated before being used for the first paint.
export const initializeAppearance = `(function(){try{var r=document.documentElement,v=JSON.parse(localStorage.getItem('${APPEARANCE_KEY}')||'null'),m=v?v.mode:localStorage.getItem('everunfold.theme');if(m==='light'||m==='dark')r.dataset.theme=m;if(v){r.dataset.amoled=v.amoled===true?'true':'false';if(v.accent!=='#673bb7'&&/^#[0-9a-f]{6}$/i.test(v.accent)&&/^#[0-9a-f]{6}$/i.test(v.light)&&/^#[0-9a-f]{6}$/i.test(v.dark)){r.dataset.customAccent='true';r.style.setProperty('--custom-accent-light',v.light);r.style.setProperty('--custom-accent-dark',v.dark);}}}catch(e){}})();`;
