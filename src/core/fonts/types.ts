export interface RegisteredFontFace {
  /** Public URL, or asset:relative/path.woff2 inside a plugin package. */
  src: string;
  format: "woff2" | "woff" | "truetype" | "opentype";
  weight?: number | readonly [number, number];
  style?: "normal" | "italic" | "oblique";
  unicodeRange?: string;
}

/** Pure declarations: neither registration nor CSS generation fetches font files. */
export interface FontDefinition {
  id: string;
  label: string;
  fallbacks?: readonly string[];
  faces?: readonly RegisteredFontFace[];
  license?: string;
}
export interface ThemeTypography {
  body?: string | null;
  heading?: string | null;
  code?: string | null;
}
