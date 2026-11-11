import type { MetadataRoute } from "next";
import { xml } from "./feeds";

function dateValue(value: string | Date | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString();
}

export function buildSitemapXml(entries: MetadataRoute.Sitemap) {
  const urls = entries
    .map((entry) => {
      const alternates = Object.entries(entry.alternates?.languages ?? {})
        .map(
          ([language, href]) =>
            `<xhtml:link rel="alternate" hreflang="${xml(language)}" href="${xml(href ?? "")}"/>`,
        )
        .join("");
      return `<url><loc>${xml(entry.url)}</loc>${entry.lastModified ? `<lastmod>${xml(dateValue(entry.lastModified))}</lastmod>` : ""}${entry.changeFrequency ? `<changefreq>${xml(entry.changeFrequency)}</changefreq>` : ""}${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ""}${alternates}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}
