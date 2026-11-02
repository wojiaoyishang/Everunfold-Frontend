import type { ComponentType } from "react";
import { EditorBody, type EditorProps } from "./editor-body";
/** Only compiled frontend adapters are executable; types choose a registered ID. */
export const contentEditors: Readonly<
  Record<string, ComponentType<EditorProps>>
> = Object.freeze({ "core.markdown": EditorBody });
