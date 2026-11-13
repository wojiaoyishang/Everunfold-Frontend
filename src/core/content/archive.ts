import { readingPage } from "@/core/pages/reading-pages";
import { languageContents, snapshotLocale } from "@/core/i18n/snapshot";
import type { PublicSnapshot } from "./types";

export function archiveRoute(snapshot: PublicSnapshot) {
  return readingPage(snapshot, "posts_page_id") ? "/archives" : "/article";
}

export function archiveArticles(snapshot: PublicSnapshot) {
  return languageContents(
    snapshot.contents.filter((entry) => entry.kind === "article"),
    snapshotLocale(snapshot),
  ).sort(
    (a, b) =>
      Date.parse(b.published_at) - Date.parse(a.published_at) ||
      a.id.localeCompare(b.id),
  );
}
