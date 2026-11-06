export function searchText(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Include configured, native and interface names without requiring an installed UI pack. */
export function languageSearchText(code: string, name: string, locale: string) {
  const labels = [code, name];
  for (const language of new Set([locale, "en", code])) {
    try {
      labels.push(
        new Intl.DisplayNames([language], { type: "language" }).of(code) ?? "",
      );
    } catch {
      // Custom language codes need not exist in the browser's language-name data.
    }
  }
  return searchText(labels.join(" "));
}
