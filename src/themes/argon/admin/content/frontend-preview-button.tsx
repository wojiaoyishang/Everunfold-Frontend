"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, useState } from "react";
import type { DraftDetail } from "@/generated/content-admin-contract";
import { contentPreviewPath } from "@/core/content-management/preview";
import { useToast } from "../../components/ui/toast/toast-provider";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";

export function FrontendPreviewButton({
  needsSave,
  disabled,
  prepare,
}: {
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
      popup.location.replace(contentPreviewPath(draft.type_id, draft.id));
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
    <Button
      className="admin-button admin-editor-preview-action"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={() => void open()}
    >
      <Icon
        name={pending ? "refresh" : "external"}
        className={pending ? "admin-spinning" : undefined}
      />
      {pending ? (
        <UiText text="正在准备预览" />
      ) : needsSave ? (
        <UiText text="保存并预览" />
      ) : (
        <UiText text="前台预览" />
      )}
    </Button>
  );
}
