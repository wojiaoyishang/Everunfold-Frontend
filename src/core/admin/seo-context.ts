"use client";
import { createContext, useContext } from "react";
import type { SeoSite } from "@/core/seo/metadata";
import type { SeoRoute } from "@/core/seo/routes";

export type AdminSeo = {
  site: SeoSite;
  origin?: string;
  routes: SeoRoute[];
};

export const AdminSeoContext = createContext<AdminSeo | null>(null);
export const useAdminSeo = () => useContext(AdminSeoContext);
