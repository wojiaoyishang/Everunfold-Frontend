import type { PageInjection } from "@/core/contracts/settings";

export const pageInjectionPluginId = "core.page-injections";
export const pageInjectionSettingsPath =
  "/admin/plugins/core.page-injections/settings";

export type PageInjectionSurface = "public" | "admin" | "account";
export type InjectionPageType = NonNullable<PageInjection["page_type"]>;

function normalize(value: string) {
  try {
    value = decodeURI(value);
  } catch {
    // Match literal paths if a browser pathname contains a malformed escape.
  }
  return value.replace(/\/+$/, "") || "/";
}

/** Match a pathname with bounded wildcard matching. * stays within one segment. */
export function matchesInjectionPath(pattern: string, path: string): boolean {
  if (!pattern) return true;
  const value = normalize(path);
  const target = normalize(pattern);
  if (!target.includes("*")) return target === value;
  if (value.length > 2048) return false;
  let row = new Uint8Array(value.length + 1);
  row[0] = 1;
  for (let i = 0; i < target.length; i++) {
    const token = target[i];
    const next = new Uint8Array(value.length + 1);
    if (token === "*") {
      const crossSegment = target[i + 1] === "*";
      if (crossSegment) i++;
      next[0] = row[0];
      for (let j = 1; j <= value.length; j++)
        next[j] =
          row[j] || (crossSegment || value[j - 1] !== "/" ? next[j - 1] : 0);
    } else {
      for (let j = 1; j <= value.length; j++)
        if (value[j - 1] === token) next[j] = row[j - 1];
    }
    row = next;
  }
  return Boolean(row[value.length]);
}

export function isInjectionRecoveryPath(path: string) {
  return [pageInjectionSettingsPath, "/admin/settings/plugins"].includes(
    normalize(path),
  );
}

export function matchesPageInjection(
  rule: PageInjection,
  context: {
    surface: PageInjectionSurface;
    type: InjectionPageType;
    path: string;
    topMenu: boolean;
  },
) {
  return (
    rule.enabled &&
    !isInjectionRecoveryPath(context.path) &&
    (rule.scope === "all" ||
      rule.scope === context.surface ||
      (rule.scope === "top-menu" &&
        context.surface === "public" &&
        context.topMenu)) &&
    (!rule.page_type || rule.page_type === context.type) &&
    matchesInjectionPath(rule.path ?? "", context.path)
  );
}
