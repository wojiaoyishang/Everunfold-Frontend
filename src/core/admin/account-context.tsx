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
