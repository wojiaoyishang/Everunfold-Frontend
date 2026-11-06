import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/generated/public-v0.1.schema.json";
import type { Content } from "@/core/content/types";
import type {
  DraftDetail,
  DraftFields,
  MediaURL,
} from "@/generated/content-admin-contract";
import { previewContent } from "@/core/content-management/preview";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "live-content",
);
const validate = ajv.compile<Content>({
  $ref: "live-content#/definitions/ContentDetail",
});
export function checkedLiveContent(
  value: unknown,
  type: string,
  id: string,
): Content | null {
  return validate(value) && value.id === id && value.kind === type
    ? value
    : null;
}
export function editorPreviewContent(
  detail: DraftDetail,
  fields: DraftFields,
  media: Record<string, MediaURL>,
): Content {
  const content = previewContent(
    {
      ...detail,
      title: fields.title ?? "",
      excerpt: fields.excerpt ?? "",
      body: fields.body,
      settings: fields.settings ?? undefined,
      media_urls: media,
    },
    [],
  );
  return { ...content, path: content.path || `/preview/${detail.id}` };
}
