"use client";

import type { GlossaryContract } from "@/core/contracts/glossary";
import {
  readContentGlossaryMatches,
  readGlossaryIndex,
} from "@/core/contracts/glossary";
import type { RequestOptions } from "@/core/http/request";

export type GlossaryRuntimeOptions = {
  auto_match: boolean;
  max_matches_per_page: number;
  popup_source: "summary" | "content";
  show_footnotes: boolean;
};

type CacheEntry = {
  expires: number;
  pending: Promise<GlossaryContract["content_matches"]["data"]>;
};

const cache = new Map<string, CacheEntry>();
const indexCache = new Map<
  string,
  {
    expires: number;
    pending: Promise<GlossaryContract["public_index"]["data"]>;
  }
>();
const CACHE_MS = 5 * 60 * 1000;

function pruneExpired<T>(entries: Map<string, { expires: number } & T>) {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.expires <= now) entries.delete(key);
  }
}

export function loadGlossaryMatches(
  baseUrl: string,
  contentId: string,
  revision: string,
  options: RequestOptions = {},
) {
  const key = `${baseUrl}\0${contentId}\0${revision}`;
  pruneExpired(cache);
  const current = cache.get(key);
  if (current && current.expires > Date.now()) return current.pending;
  const pending = readContentGlossaryMatches(baseUrl, contentId, options).then(
    (response) => response.data,
  );
  cache.set(key, { expires: Date.now() + CACHE_MS, pending });
  pending.catch(() => {
    if (cache.get(key)?.pending === pending) cache.delete(key);
  });
  return pending;
}

export function loadGlossaryIndex(
  baseUrl: string,
  language: string,
  options: RequestOptions = {},
) {
  const key = `${baseUrl}\0${language}`;
  pruneExpired(indexCache);
  const current = indexCache.get(key);
  if (current && current.expires > Date.now()) return current.pending;
  const pending = readGlossaryIndex(baseUrl, language, options).then(
    (response) => response.data,
  );
  indexCache.set(key, { expires: Date.now() + CACHE_MS, pending });
  pending.catch(() => {
    if (indexCache.get(key)?.pending === pending) indexCache.delete(key);
  });
  return pending;
}

export function clearGlossaryCache() {
  cache.clear();
  indexCache.clear();
}
