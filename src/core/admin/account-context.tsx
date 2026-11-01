"use client";
import { createContext, useContext } from "react";
import type { AuthUser } from "@/generated/auth-contract";
export const AdminAccountContext = createContext<AuthUser | null>(null);
export function useAdminAccount() {
  const user = useContext(AdminAccountContext);
  if (!user)
    throw new Error("Admin pages require a confirmed account boundary.");
  return user;
}

export const AdminRequestContext = createContext<{
  baseUrl: string;
  csrfToken: string;
} | null>(null);
export function useAdminRequest() {
  const value = useContext(AdminRequestContext);
  if (!value) throw new Error("Admin operations require a confirmed session");
  return value;
}
