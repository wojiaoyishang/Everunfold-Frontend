import Ajv from "ajv";
import schema from "@/core/contracts/pages-v1-schema";
import type { BuilderDocument, BuilderValues } from "@/core/builder/types";
import type { MediaItem, PublicShortcode } from "@/core/contracts/settings";
import type { MediaURL } from "@/core/contracts/content-admin";

/** Private, same-window preview messages. Persistence still belongs to the editor. */
export interface LiveBuilderState {
  document: BuilderDocument;
  parameters: BuilderValues;
  linked: boolean;
  disabled: boolean;
  allowComments: boolean;
  canSaveTemplate: boolean;
  media: Record<string, MediaURL>;
  shortcodes: readonly PublicShortcode[];
}
export interface LiveBuilderChange {
  document?: BuilderDocument;
  parameters?: BuilderValues;
  media?: MediaItem;
  mediaUrls?: Record<string, MediaURL>;
  saveTemplate?: boolean;
}
const ajv = new Ajv({ strict: true });
const validateDocument = ajv.compile<BuilderDocument>({
  $defs: schema.$defs,
  $ref: "#/$defs/ComponentDocument",
});
const validateMedia = ajv.compile<Record<string, MediaURL>>({
  $defs: schema.$defs,
  type: "object",
  propertyNames: { pattern: "^[a-fA-F0-9-]{36}$" },
  additionalProperties: { $ref: "#/$defs/MediaURL" },
});
export function checkedBuilderState(value: unknown): LiveBuilderState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as LiveBuilderState;
  return validateDocument(v.document) &&
    v.parameters &&
    typeof v.parameters === "object" &&
    !Array.isArray(v.parameters) &&
    typeof v.linked === "boolean" &&
    typeof v.disabled === "boolean" &&
    typeof v.allowComments === "boolean" &&
    typeof v.canSaveTemplate === "boolean" &&
    v.media &&
    typeof v.media === "object" &&
    Array.isArray(v.shortcodes)
    ? v
    : null;
}
export function checkedBuilderChange(
  value: unknown,
  state: LiveBuilderState,
): LiveBuilderChange | null {
  if (state.disabled || !value || typeof value !== "object") return null;
  const v = value as LiveBuilderChange;
  if (v.document && (state.linked || !validateDocument(v.document)))
    return null;
  if (
    v.parameters &&
    (typeof v.parameters !== "object" || Array.isArray(v.parameters))
  )
    return null;
  if (
    v.mediaUrls !== undefined &&
    (state.linked || !v.document || !validateMedia(v.mediaUrls))
  )
    return null;
  if (v.saveTemplate && !state.canSaveTemplate) return null;
  if (
    v.media &&
    (typeof v.media.id !== "string" || typeof v.media.url !== "string")
  )
    return null;
  return v;
}
