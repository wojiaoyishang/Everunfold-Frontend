export function normalizePath(value: string): string {
  let result = value;
  try {
    result = decodeURI(result);
  } catch {
    return value;
  }
  return result.length > 1 ? result.replace(/\/+$/, "") : result;
}

export function publicHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001f\u007f\\]/.test(trimmed)) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (trimmed.startsWith("#")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (
      !["http:", "https:", "mailto:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function resourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function taxonomyHref(taxonomy: {
  kind: "category" | "tag";
  slug: string;
}): string {
  return `/${taxonomy.kind}/${encodeURIComponent(taxonomy.slug)}`;
}
