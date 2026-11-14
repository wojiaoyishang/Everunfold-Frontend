"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { adminPreferencesKey } from "@/core/admin/preferences";
import { useAdminPreferences } from "@/core/admin/use-admin-preferences";
import { useT } from "@/core/i18n/provider";
import { isManagementRoute } from "@/core/auth/routes";
import {
  useLiveBridge,
  type LiveEditorState,
} from "@/core/preview/use-live-bridge";
import { useLiveLeave } from "@/core/preview/use-live-leave";
import { previewNavigation } from "@/core/preview/bridge";
import {
  livePreviewPath,
  previewEditorPath,
  type PreviewKind,
} from "@/core/preview/routes";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { LiveEditorSurface, type LivePanel } from "../admin/builder/editor";
import styles from "./live-workspace.module.css";

export function LivePreviewWorkspace({
  kind,
  id,
}: {
  kind: PreviewKind;
  id: string;
}) {
  const actor = useAdminAccount(),
    { baseUrl } = useAdminRequest();
  const { preferences } = useAdminPreferences(
    adminPreferencesKey(baseUrl, actor.id),
  );
  const view = useRef<HTMLIFrameElement>(null),
    editor = useRef<HTMLIFrameElement>(null);
  const [editorState, setEditorState] = useState<LiveEditorState>({
    dirty: false,
    busy: false,
  });
  const [inlineActive, setInlineActive] = useState(false);
  const [panel, setPanel] = useState<LivePanel>("content");
  const editorId = useId();
  const setEmbeddedPanel = useCallback(() => {
    const document = editor.current?.contentDocument;
    if (document) document.documentElement.dataset.livePanel = panel;
  }, [panel]);
  useEffect(setEmbeddedPanel, [setEmbeddedPanel]);
  const t = useT();
  const editPath = previewEditorPath(kind, id);
  const previewPath =
    kind === "page" || kind === "template"
      ? `/admin/pages/${id}/preview?live-workspace=1${kind === "template" ? "&template=1" : ""}`
      : `/admin/content/${kind}/${id}/preview?live-workspace=1`;
  const leave = useLiveLeave(
    editPath,
    editorState.dirty || inlineActive,
    editorState.busy,
  );
  const onLocation = useCallback(
    (path: string) => {
      const url = previewNavigation(path, window.location.origin);
      if (
        !url ||
        url.origin !== window.location.origin ||
        !isManagementRoute(url.pathname) ||
        url.pathname === editPath
      )
        return;
      const page = /^\/admin\/pages\/([a-f0-9-]{36})$/.exec(url.pathname);
      const template = /^\/admin\/pages\/templates\/([a-f0-9-]{36})$/.exec(
        url.pathname,
      );
      const content =
        /^\/admin\/content\/(article|shuoshuo)\/([a-f0-9-]{36})\/edit$/.exec(
          url.pathname,
        );
      window.location.assign(
        page
          ? livePreviewPath("page", page[1])
          : template
            ? livePreviewPath("template", template[1])
            : content
              ? livePreviewPath(content[1] as PreviewKind, content[2])
              : url.pathname + url.search + url.hash,
      );
    },
    [editPath],
  );
  const onFocusEditor = useCallback(() => setPanel("content"), []);
  const bridge = useLiveBridge({
    kind,
    id,
    editor,
    view,
    onEditorState: setEditorState,
    onLeave: leave.request,
    onLocation,
    onFocusEditor,
  });
  return (
    <div
      className={`admin-root ${styles.workspace}`}
      data-surface="admin"
      data-live-workspace
      data-admin-mode={preferences.mode}
      data-admin-motion={preferences.motion}
    >
      <LiveEditorSurface
        builder={bridge.builder}
        changeBuilder={bridge.changeBuilder}
        frame={{
          ref: view,
          src: previewPath,
          onLoad: bridge.loadPreview,
          status: bridge.status,
          retry: bridge.retry,
        }}
        editorPanelId={editorId}
        editor={
          <iframe
            ref={editor}
            src={editPath + "?preview-embed=1"}
            name={`everunfold-live-editor-${id}`}
            title={t("实时预览编辑器")}
            onLoad={() => {
              setEmbeddedPanel();
              bridge.loadEditor();
            }}
          />
        }
        ready={bridge.documentTitle !== null}
        saveBlocked={inlineActive || bridge.awaitingBuilder}
        onInlineActiveChange={setInlineActive}
        title={bridge.documentTitle ?? ""}
        published={editorState.published ?? null}
        kind={kind}
        busy={editorState.busy}
        panel={panel}
        setPanel={setPanel}
        onExit={() => leave.request(editPath)}
      />
      <ConfirmDialog
        open={!!leave.destination}
        title="离开实时预览？"
        description="当前修改尚未保存，离开会丢失这些输入。可以继续编辑并保存后再离开。"
        confirmLabel="放弃修改并离开"
        cancelLabel="继续编辑"
        busy={editorState.busy}
        onCancel={leave.cancel}
        onConfirm={() => true}
        onConfirmed={leave.leave}
      />
    </div>
  );
}
