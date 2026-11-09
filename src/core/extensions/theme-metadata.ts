import type { InstalledTheme } from "@/core/contracts/settings";
import { resourceUrl } from "@/core/content/urls";
import type { ThemeDefinition } from "./types";

/** Only deployment-owned display metadata is exported; never component implementations. */
export function themeMetadata(theme: ThemeDefinition): InstalledTheme {
  const text = (value: unknown, max: number, required = false) =>
    typeof value === "string" &&
    value.length <= max &&
    (!required || Boolean(value.trim()));
  const url = (value: unknown) =>
    text(value, 2048) && (!value || Boolean(resourceUrl(value as string)));
  const title = theme.title ?? theme.id;
  const author = theme.author;
  if (
    !text(title, 80, true) ||
    !text(theme.description ?? "", 500) ||
    !text(theme.license ?? "", 100) ||
    !url(theme.preview ?? "") ||
    !url(theme.homepage ?? "") ||
    !url(theme.repository ?? "") ||
    (author != null &&
      (typeof author !== "object" ||
        Array.isArray(author) ||
        !text(author.name, 100, true) ||
        !url(author.url ?? "")))
  )
    throw new Error(`Invalid theme metadata: ${theme.id}`);
  return {
    id: theme.id,
    title,
    version: theme.version,
    parent:
      theme.parent === undefined && theme.id !== "argon"
        ? "argon"
        : (theme.parent ?? null),
    description: theme.description ?? "",
    preview: theme.preview ?? "",
    author: author ? { name: author.name.trim(), url: author.url ?? "" } : null,
    homepage: theme.homepage ?? "",
    repository: theme.repository ?? "",
    license: theme.license ?? "",
  };
}
