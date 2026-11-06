"use client";
import { useCallback, useEffect, useState } from "react";
import { useEditorNavigation } from "@/core/content-management/use-editor-navigation";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { isEmbeddedEditor } from "@/core/preview/bridge";

export function UnsavedAccountChanges({
  dirty,
  busy,
}: {
  dirty: boolean;
  busy: boolean;
}) {
  const [destination, setDestination] = useState("");
  const request = useCallback((href: string) => setDestination(href), []);
  useEditorNavigation(dirty, busy, request);
  useEffect(() => {
    if ((!dirty && !busy) || isEmbeddedEditor()) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  return (
    <ConfirmDialog
      open={!!destination}
      title="放弃未保存的修改？"
      description="当前输入尚未保存，离开页面会丢失这些修改。"
      confirmLabel="放弃修改并离开"
      onCancel={() => setDestination("")}
      onConfirm={() => true}
      onConfirmed={() => location.assign(destination)}
    />
  );
}
