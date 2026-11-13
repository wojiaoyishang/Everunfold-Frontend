export type BuilderValue =
  | null
  | boolean
  | number
  | string
  | BuilderValue[]
  | { [key: string]: BuilderValue };

export type BuilderValues = Record<string, BuilderValue>;

export interface BuilderParameter {
  id: string;
  label: string;
  keep_default?: boolean;
}

export interface BuilderNode {
  id: string;
  type: string;
  props: BuilderValues;
  children?: BuilderNode[];
  parameters?: Record<string, BuilderParameter>;
}

export interface BuilderDocument {
  version: 1;
  nodes: BuilderNode[];
}

export type BuilderFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "boolean"
  | "media"
  | "markdown"
  | "html"
  | "shortcode"
  | "url";

export interface BuilderField {
  key: string;
  label: string;
  type: BuilderFieldType;
  default?: BuilderValue;
  options?: readonly { value: string; label: string }[];
  min?: number;
  max?: number;
  multiple?: boolean;
  expose?: boolean;
}

export interface BuilderComponentDefinition {
  type: string;
  label: string;
  group?: "layout" | "content" | "media" | "interactive";
  component?: string;
  shortcode?: string;
  container?: boolean;
  fields?: readonly BuilderField[];
}

export type BuilderDevice = "desktop" | "tablet" | "mobile";
