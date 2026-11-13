import { titlePath } from "@/core/content-management/editor-fields";
import { pageUrlErrors } from "./failure";

export function suggestedPagePath(title: string, prefix = ""): string {
  if (!title.trim()) return "";
  return prefix + (titlePath(title) || "/page.html");
}

export function pageUrlError(input: string): string {
  const value = input.trim();
  if (!value.startsWith("/")) return pageUrlErrors[42205];
  if (Array.from(value).length > 500) return pageUrlErrors[42208];
  try {
    const path = decodeURIComponent(value).normalize("NFC");
    if (
      /[\s\u0000-\u001f\\?#%<>]/u.test(path) ||
      path
        .slice(1)
        .split("/")
        .some((part) => part === "" || part === "." || part === "..")
    )
      return pageUrlErrors[42206];
  } catch {
    return pageUrlErrors[42206];
  }
  return "";
}
