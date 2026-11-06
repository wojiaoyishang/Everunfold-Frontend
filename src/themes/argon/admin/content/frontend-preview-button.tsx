"use client";

import { useEffect, useRef, useState } from "react";
import type { DraftDetail } from "@/generated/content-admin-contract";
import { contentPreviewPath } from "@/core/content-management/preview";
import { useToast } from "../../components/ui/toast/toast-provider";
import { PreviewAction } from "../components/preview-action";
import { livePreviewPath } from "@/core/preview/routes";

export function FrontendPreviewButton({
  needsSave,
  disabled,
  prepare,
  mode = "preview",
}: {
  mode?: "preview" | "live";
  needsSave: boolean;
  disabled: boolean;
  prepare: () => Promise<DraftDetail | null>;
}) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const opening = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const open = async () => {
    if (opening.current) return;
    // Reserve the tab in the click gesture; only navigate after a confirmed draft save.
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      toast.show({
        id: "content:preview",
        title: "请允许此站点打开新标签页后重试。",
        tone: "error",
      });
      return;
    }
    popup.opener = null;
    opening.current = true;
    setPending(true);
    try {
      const draft = await prepare();
      if (!draft) {
        popup.close();
        return;
      }
      popup.location.replace(
        mode === "live" &&
          (draft.type_id === "article" || draft.type_id === "shuoshuo")
          ? livePreviewPath(draft.type_id, draft.id)
          : contentPreviewPath(draft.type_id, draft.id),
      );
    } catch {
      popup.close();
      toast.show({
        id: "content:preview",
        title: "未能打开前台预览，请重试。",
        tone: "error",
      });
    } finally {
      opening.current = false;
      if (mounted.current) setPending(false);
    }
  };
  return (
    <PreviewAction
      icon={pending ? "refresh" : mode === "live" ? "sidebar" : "external"}
      label={
        pending
          ? "正在准备预览"
          : mode === "live"
            ? "实时预览"
            : needsSave
              ? "保存并预览"
              : "前台预览"
      }
      description={
        mode === "live" ? "在独立窗口中查看页面并编辑" : "在新窗口查看前台预览"
      }
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={() => void open()}
    />
  );
}
