"use client";

import { createContext } from "react";
import type { GlossaryPopup } from "@/core/shortcodes/glossary";

export type GlossaryPopups = Readonly<Record<string, GlossaryPopup>>;

export const GlossaryPopupScope = createContext<{
  popups?: GlossaryPopups;
  ancestors: readonly Set<HTMLElement>[];
  terms: readonly string[];
}>({ ancestors: [], terms: [] });
