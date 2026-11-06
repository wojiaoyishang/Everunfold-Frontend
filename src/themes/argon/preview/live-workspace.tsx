"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { adminPreferencesKey } from "@/core/admin/preferences";
import { useAdminPreferences } from "@/core/admin/use-admin-preferences";
import { UiText, useT } from "@/core/i18n/provider";
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
import { Button } from "../components/ui/primitives";
import { SplitHandle } from "../components/ui/split-handle";
import { Icon } from "../components/icon";
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
  const [mobile, setMobile] = useState("preview");
  const [editorWidth, setEditorWidth] = useState(390);
  const [resizing, setResizing] = useState(false);
  const [maxEditorWidth, setMaxEditorWidth] = useState(720);
  const panes = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const max = Math.max(
        300,
        Math.min(720, Math.floor((entry.contentRect.width - 8) / 2)),
      );
      setMaxEditorWidth(max);
      setEditorWidth((width) => Math.min(width, max));
    });
    if (panes.current) observer.observe(panes.current);
    return () => observer.disconnect();
  }, []);
  const editorId = useId();
  const [device, setDevice] = useState("desktop");
  const t = useT();
  const editPath = previewEditorPath(kind, id);
  const previewPath =
    kind === "page"
      ? `/admin/pages/${id}/preview`
      : `/admin/content/${kind}/${id}/preview`;
  const leave = useLiveLeave(editPath, editorState.dirty, editorState.busy);
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
      const content =
        /^\/admin\/content\/(article|shuoshuo)\/([a-f0-9-]{36})\/edit$/.exec(
          url.pathname,
        );
      window.location.assign(
        page
          ? livePreviewPath("page", page[1])
          : content
            ? livePreviewPath(content[1] as PreviewKind, content[2])
            : url.pathname + url.search + url.hash,
      );
    },
    [editPath],
  );
  const onFocusEditor = useCallback(() => setMobile("editor"), []);
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
      data-admin-mode={preferences.mode}
      data-admin-motion={preferences.motion}
    >
      <header className={styles.toolbar}>
        <Button
          className="admin-button"
          onClick={() => leave.request(editPath)}
          disabled={editorState.busy}
          title={t("完整编辑器")}
          aria-label={t("完整编辑器")}
        >
          <Icon name="logout" />
          <span className={styles.fullEditorLabel}>
            <UiText text="完整编辑器" />
          </span>
        </Button>
        <strong>
          <Icon name="eye" />
          <UiText text="实时预览" />
        </strong>
        <span className={styles.notice}>
          <UiText text="左侧编辑，右侧查看前台；保存和发布仍由你确认。" />
        </span>
        <nav className={styles.devices} aria-label={t("预览设备")}>
          {(
            [
              ["desktop", "电脑"],
              ["tablet", "iPad"],
              ["phone", "手机"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              aria-label={t(label)}
              title={t(label)}
              aria-pressed={device === value}
              onClick={() => {
                setDevice(value);
                setMobile("preview");
              }}
            >
              <Icon name={value} />
              <span>
                <UiText text={label} />
              </span>
            </Button>
          ))}
        </nav>
        <div>
          <Button
            className={`admin-button ${styles.mobileSwitch}`}
            aria-label={t(mobile === "editor" ? "查看页面" : "显示编辑器")}
            title={t(mobile === "editor" ? "查看页面" : "显示编辑器")}
            onClick={() =>
              setMobile((value) => (value === "editor" ? "preview" : "editor"))
            }
          >
            <Icon name={mobile === "editor" ? "eye" : "edit"} />
            <span>
              <UiText text={mobile === "editor" ? "查看页面" : "显示编辑器"} />
            </span>
          </Button>
          <div className={styles.editorActions} data-live-editor-actions />
        </div>
      </header>
      <div
        ref={panes}
        className={styles.panes}
        data-mobile={mobile}
        data-resizing={resizing}
        style={{ "--editor-width": `${editorWidth}px` } as CSSProperties}
      >
        <aside className={styles.editor} id={editorId}>
          <iframe
            ref={editor}
            src={`${editPath}?preview-embed=1`}
            name={`everunfold-live-editor-${id}`}
            title={t("实时预览编辑器")}
            onLoad={bridge.loadEditor}
          />
        </aside>
        <SplitHandle
          value={editorWidth}
          min={300}
          max={maxEditorWidth}
          label={t("拖动调整编辑区宽度；方向键微调")}
          controls={editorId}
          className={styles.splitHandle}
          onDragging={setResizing}
          onChange={setEditorWidth}
        />
        <section
          className={styles.view}
          data-device={device}
          aria-busy={bridge.status !== "ready"}
        >
          {bridge.status !== "ready" && (
            <div
              className={styles.previewStatus}
              data-error={bridge.status === "error"}
              role="status"
            >
              <Icon
                name={bridge.status === "error" ? "cloud-off" : "refresh"}
                className={bridge.status === "error" ? "" : styles.spin}
              />
              <UiText
                text={
                  bridge.status === "error"
                    ? "预览更新未完成，请重试。"
                    : bridge.status === "loading"
                      ? "正在载入预览…"
                      : "正在更新预览…"
                }
              />
              {bridge.status === "error" && (
                <Button onClick={bridge.retry}>
                  <UiText text="重试" />
                </Button>
              )}
            </div>
          )}
          <iframe
            ref={view}
            name={`everunfold-live-preview-${id}`}
            src={previewPath}
            title={t("前台实时预览")}
            onLoad={bridge.loadPreview}
          />
        </section>
      </div>
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
