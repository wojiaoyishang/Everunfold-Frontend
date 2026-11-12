import type { PublicSnapshot } from "@/core/content/types";
import { discoveryXmlUrl, feedItems } from "./discovery";

/** XML text and attributes share escaping; control characters cannot corrupt the feed. */
export const xml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export function buildFeed(
  snapshot: PublicSnapshot,
  origin: string,
  format: "rss" | "atom",
  language?: string,
): string {
  const items = feedItems(snapshot, language);
  const site = snapshot.site;
  const url = (path: string) => xml(new URL(path, origin).href);
  const self = new URL(format === "rss" ? "/feed.xml" : "/atom.xml", origin);
  if (language) self.searchParams.set("language", language);
  const selfXml = xml(discoveryXmlUrl(self.href, origin));
  const intro = '<?xml version="1.0" encoding="UTF-8"?>';
  if (format === "rss")
    return `${intro}<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(site.name)}</title><link>${url("/")}</link><description>${xml(site.settings?.site.seo_description || site.description)}</description><atom:link href="${selfXml}" rel="self" type="application/rss+xml"/>${items.map((item) => `<item><title>${xml(item.title)}</title><link>${url(item.path)}</link><guid isPermaLink="false">urn:uuid:${xml(item.id)}</guid><pubDate>${new Date(item.published_at).toUTCString()}</pubDate><description>${xml(item.excerpt)}</description>${item.categories.map((term) => `<category>${xml(term.name)}</category>`).join("")}</item>`).join("")}</channel></rss>`;
  // An empty feed uses the real snapshot export time, never the request time.
  const updated = items.length
    ? new Date(
        Math.max(...items.map((item) => Date.parse(item.updated_at))),
      ).toISOString()
    : snapshot.exported_at;
  return `${intro}<feed xmlns="http://www.w3.org/2005/Atom"><id>${xml(self.href)}</id><title>${xml(site.name)}</title><subtitle>${xml(site.description)}</subtitle><link href="${url("/")}"/><link href="${selfXml}" rel="self" type="application/atom+xml"/><updated>${updated}</updated><author><name>${xml(site.author || site.name)}</name></author>${items.map((item) => `<entry><id>urn:uuid:${xml(item.id)}</id><title>${xml(item.title)}</title><link href="${url(item.path)}"/><published>${item.published_at}</published><updated>${item.updated_at}</updated><author><name>${xml(item.author)}</name></author><summary>${xml(item.excerpt)}</summary></entry>`).join("")}</feed>`;
}
