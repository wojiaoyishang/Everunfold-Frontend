import type {
  ArticleDisplayPreferences,
  CodePreferences,
  FeedPreferences,
  PublicSettings,
  ThemePreferences,
} from "@/core/contracts/settings";

export const fallbackThemeId = "argon";
const articleDefaults: Required<ArticleDisplayPreferences> = {
  show_updated: false,
  show_toc: true,
  meta_order: [
    "author",
    "published",
    "updated",
    "words",
    "reading",
    "comments",
    "views",
  ],
  cover_position: "above",
  words_per_minute: 200,
  han_per_minute: 400,
  stale_days: 0,
  stale_basis: "updated",
  related_basis: "both",
  afterword: "",
  show_author: true,
  show_date: true,
  show_word_count: true,
  show_reading_time: true,
  show_comments: true,
  show_views: true,
  show_share: true,
  show_neighbors: true,
  show_related: true,
  related_count: 6,
  toc_numbered: false,
};
const codeDefaults: Required<CodePreferences> = {
  light_scheme: "paper",
  dark_scheme: "slate",
  line_numbers: true,
  wrap: false,
  collapse_lines: 18,
  font_size: 13,
  line_height: 1.7,
  tab_size: 4,
  font_media_id: "",
  font_url: "",
  font_info: null,
};
const feedDefaults: Required<FeedPreferences> = {
  default_type: "all",
  page_size: 10,
};
export type RuntimeThemePreferences = Required<
  Omit<ThemePreferences, "navigation">
> & {
  article: Required<ArticleDisplayPreferences>;
  code: Required<CodePreferences>;
  feed: Required<FeedPreferences>;
  navigation?: ThemePreferences["navigation"];
};
const defaults: RuntimeThemePreferences = {
  author_avatar_media_id: "",
  author_avatar_url: null,
  header_brand_mode: "both",
  header_brand_text: "",
  header_logo_media_id: "",
  header_logo_url: "",
  article: articleDefaults,
  code: codeDefaults,
  feed: feedDefaults,
  font_media_id: "",
  font_url: "",
  font_info: null,
  accent: "#673bb7",
  mode: "system",
  hero_title: "",
  hero_subtitle: "",
  hero_show_subtitle: true,
  hero_animation: "rise",
  hero_typing_ms: 30,
  sidebar_profile: {},
  sidebar_navigation: {},
  background_media_id: "",
  background_video_media_id: "",
  background_url: "",
  background_video_url: "/themes/argon/background/campfire.webm",
  background_play: true,
  paper_tone: "ivory",
};

export function activeThemeId(settings: PublicSettings | null | undefined) {
  return settings?.extensions?.theme || fallbackThemeId;
}

export function themeProfile(
  settings: PublicSettings | null | undefined,
  themeId = activeThemeId(settings),
): RuntimeThemePreferences | undefined {
  const value = settings?.theme_options?.[themeId] ?? settings?.theme;
  if (!value) return undefined;
  return {
    ...defaults,
    ...value,
    article: { ...defaults.article, ...value.article },
    code: { ...defaults.code, ...value.code },
    feed: { ...defaults.feed, ...value.feed },
  };
}

export function updateThemeProfile(
  settings: PublicSettings,
  themeId: string,
  patch: Partial<ThemePreferences>,
): PublicSettings {
  const current = themeProfile(settings, themeId) ?? defaults;
  const next = { ...current, ...patch };
  return {
    ...settings,
    theme: themeId === activeThemeId(settings) ? next : settings.theme,
    theme_options: { ...settings.theme_options, [themeId]: next },
  };
}
