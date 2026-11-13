"use client";

import { createContext } from "react";
import type { SitePreferences } from "@/core/contracts/settings";

export type SiteBrand = Pick<SitePreferences, "name" | "icon_url">;

export const defaultSiteName = "Everunfold";
export const SiteBrandContext = createContext<SiteBrand | null>(null);
