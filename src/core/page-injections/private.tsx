"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  readAccountPageInjections,
  readAdminPageInjections,
  type PageInjection,
} from "@/core/contracts/settings";
import { useAdminRequest } from "@/core/admin/account-context";
import { isContentPreviewPath } from "@/core/content-management/preview";
import { isManagedPagePreviewPath } from "@/core/pages/preview";
import { isLivePreviewPath } from "@/core/preview/routes";
import { isInjectionRecoveryPath } from "./matching";
import { PageInjectionRuntime } from "./runtime";

export function PrivatePageInjections({
  surface,
  enabled,
}: {
  surface: "admin" | "account";
  enabled: boolean;
}) {
  const { baseUrl } = useAdminRequest();
  const path = usePathname();
  const [result, setResult] = useState<{
    path: string;
    baseUrl: string;
    rules: PageInjection[];
  }>();
  const eligible =
    enabled &&
    !isInjectionRecoveryPath(path) &&
    !isContentPreviewPath(path) &&
    !isManagedPagePreviewPath(path) &&
    !isLivePreviewPath(path);
  useEffect(() => {
    if (!eligible) return;
    const controller = new AbortController();
    const read =
      surface === "admin" ? readAdminPageInjections : readAccountPageInjections;
    void read(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setResult({ path, baseUrl, rules: data.rules ?? [] });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ path, baseUrl, rules: [] });
      });
    return () => controller.abort();
  }, [baseUrl, path, eligible, surface]);

  if (!eligible || path !== result?.path || baseUrl !== result.baseUrl)
    return null;
  return <PageInjectionRuntime surface={surface} rules={result.rules} />;
}
