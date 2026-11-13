import Ajv from "ajv";
import addFormats from "ajv-formats";
import publicSchema from "@/core/contracts/public-v0.1-schema";
import type { PublicSnapshot } from "./types";
import { normalizePath } from "./urls";

const ajv = new Ajv({ strict: true, allErrors: false });
addFormats(ajv);
const validate = ajv.compile<PublicSnapshot>(
  Object.fromEntries(
    Object.entries(publicSchema).filter(([key]) => !key.startsWith("x-")),
  ),
);

export function parsePublicSnapshot(input: unknown): PublicSnapshot {
  if (!validate(input)) throw new Error("Invalid public snapshot contract");
  if (
    input.contents.some(
      (item) => item.read_receipt || item.unlocked_comments?.length,
    )
  )
    throw new Error("Private reader data leaked into public snapshot");
  if (
    input.contents.some(
      (item) =>
        item.access &&
        item.access !== "public" &&
        (item.content.length ||
          item.component_document != null ||
          Object.keys(item.media_urls).length ||
          item.excerpt ||
          item.cover_url ||
          item.seo_description ||
          item.seo_title ||
          item.seo_canonical_path ||
          item.seo_share_title ||
          item.seo_share_description ||
          item.seo_image_alt ||
          item.share_image_url ||
          item.seo_max_snippet != null ||
          item.seo_image_preview ||
          item.seo_structured_data != null ||
          item.word_count ||
          item.comment_count),
    )
  )
    throw new Error("Restricted content leaked into public snapshot");
  if (
    input.contents.some((item) => item.access === "scheduled" && !item.opens_at)
  )
    throw new Error("Scheduled content is missing its opening time");
  const ids = new Set(input.contents.map((item) => item.id));
  const paths = new Set(input.contents.map((item) => normalizePath(item.path)));
  if (
    ids.size !== input.contents.length ||
    paths.size !== input.contents.length
  )
    throw new Error("Duplicate public content identity");
  if (
    input.contents.some(
      (item) =>
        item.path.startsWith("//") ||
        /[\\?#\u0000-\u001f\u007f]/.test(item.path),
    )
  )
    throw new Error("Invalid public content path");
  const pageIds = new Set<string>();
  for (const page of input.pages ?? []) {
    if (page.read_receipt)
      throw new Error("Private page reader data leaked into public snapshot");
    if (
      page.access === "captcha" &&
      (page.html ||
        page.css ||
        page.javascript ||
        page.component_document != null ||
        Object.keys(page.component_parameters ?? {}).length ||
        Object.keys(page.media_urls ?? {}).length ||
        page.description ||
        page.seo_description ||
        page.seo_title ||
        page.seo_canonical_path ||
        page.seo_share_title ||
        page.seo_share_description ||
        page.seo_image_alt ||
        page.share_image_url ||
        page.seo_max_snippet != null ||
        page.seo_image_preview ||
        page.seo_structured_data != null ||
        Object.keys(page.options ?? {}).length)
    )
      throw new Error("Restricted page leaked into public snapshot");
    const normalized = normalizePath(page.path);
    if (
      !page.path.startsWith("/") ||
      page.path.startsWith("//") ||
      /\/{2}|(?:^|\/)\.{1,2}(?:\/|$)/.test(page.path) ||
      pageIds.has(page.id) ||
      ids.has(page.id) ||
      paths.has(normalized) ||
      /^\/(?:admin|account|login|api|v1|internal|_next|reference|media|archives|article|categories|category|tag|tags|search|ss)(?:\/|$)/i.test(
        page.path,
      ) ||
      normalized !== page.path ||
      /[\\?#%\u0000-\u001f]/.test(page.path)
    )
      throw new Error("Invalid or duplicate managed page path");
    pageIds.add(page.id);
    paths.add(normalized);
  }
  if (
    Object.keys(input.comments).some(
      (contentId) => !ids.has(contentId) && !pageIds.has(contentId),
    )
  )
    throw new Error("Comments refer to unavailable content");
  for (const item of [...input.contents, ...(input.pages ?? [])]) {
    if (
      item.access &&
      item.access !== "public" &&
      input.comments[item.id]?.length
    )
      throw new Error("Restricted comments leaked into public snapshot");
  }
  return input;
}
