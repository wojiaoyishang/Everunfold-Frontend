import type { ReactNode } from "react";
import type { BuilderValues } from "@everunfold/plugin-sdk";
import {
  parseSiteMediaReference,
  resourceUrl,
} from "@everunfold/plugin-sdk/client";

export type WidgetProps = {
  values: BuilderValues;
  media?: Record<string, { original: string }>;
  preview?: boolean;
  children?: ReactNode;
};

export function text(values: BuilderValues, key: string) {
  const value = values[key];
  return typeof value === "string" ? value.trim() : "";
}

export function mediaUrl(value: string, media: WidgetProps["media"]) {
  const id = parseSiteMediaReference(value);
  return resourceUrl(id ? media?.[id]?.original : value) ?? undefined;
}
