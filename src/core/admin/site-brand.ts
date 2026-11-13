"use client";

import { createContext } from "react";
import type { SitePreferences } from "@/core/contracts/settings";

export type AdminSiteBrand = Pick<SitePreferences, "name" | "icon_url"> & {
  revision: number;
};

export const AdminSiteBrandUpdate = createContext<
  ((brand: AdminSiteBrand) => void) | null
>(null);
