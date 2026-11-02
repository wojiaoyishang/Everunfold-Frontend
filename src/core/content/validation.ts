import Ajv from "ajv";
import addFormats from "ajv-formats";
import publicSchema from "@/generated/public-v0.1.schema.json";
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
      (item) =>
        item.access &&
        item.access !== "public" &&
        (item.content.length ||
          Object.keys(item.media_urls).length ||
          item.excerpt ||
          item.cover_url ||
          item.seo_description ||
          item.seo_title ||
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
  if (Object.keys(input.comments).some((contentId) => !ids.has(contentId)))
    throw new Error("Comments refer to unavailable content");
  return input;
}
