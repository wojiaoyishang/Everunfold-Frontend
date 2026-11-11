export type SearchablePlugin = {
  id: string;
  title?: string;
  description?: string;
  version?: string;
  author?: string;
  page_ids?: readonly string[];
  shortcodes?: readonly string[];
  components?: readonly string[];
  captcha_providers?: readonly unknown[];
};

export function pluginMatchesSearch(query: string, plugin: SearchablePlugin) {
  const needle = query.normalize("NFKC").trim().toLocaleLowerCase();
  if (!needle) return true;
  return [
    plugin.id,
    plugin.title,
    plugin.description,
    plugin.version,
    plugin.author,
    ...(plugin.page_ids ?? []),
    ...(plugin.shortcodes ?? []),
    ...(plugin.components ?? []),
    ...(plugin.captcha_providers?.map(() => "验证码提供方") ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) =>
      value.normalize("NFKC").toLocaleLowerCase().includes(needle),
    );
}
