"use client";

import { createContext } from "react";
import type { SiteBrand } from "@/core/site/brand";

export type AdminSiteBrand = SiteBrand & {
  revision: number;
};

export const AdminSiteBrandUpdate = createContext<
  ((brand: AdminSiteBrand) => void) | null
>(null);
