"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { readAccountLanguages } from "@/generated/accounts-client";
import { initialCatalog, normalizeCatalog } from "./catalog";
import { LanguageCatalogProvider } from "./provider";

export function AdminLanguageCatalog({ children }: { children: ReactNode }) {
  const { baseUrl } = useAdminRequest();
  const [catalog, setCatalog] = useState(initialCatalog);
  useEffect(() => {
    let current: AbortController | undefined;
    const reload = () => {
      current?.abort();
      const request = (current = new AbortController());
      readAccountLanguages(baseUrl, { signal: request.signal })
        .then(({ data }) => {
          if (!request.signal.aborted) setCatalog(normalizeCatalog(data));
        })
        .catch(() => {});
    };
    reload();
    window.addEventListener("everunfold-language-catalog", reload);
    window.addEventListener("focus", reload);
    return () => {
      current?.abort();
      window.removeEventListener("everunfold-language-catalog", reload);
      window.removeEventListener("focus", reload);
    };
  }, [baseUrl]);
  return (
    <LanguageCatalogProvider value={catalog}>
      {children}
    </LanguageCatalogProvider>
  );
}
