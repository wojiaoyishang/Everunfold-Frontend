"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { adminPreferencesKey } from "@/core/admin/preferences";
import { useAdminPreferences } from "@/core/admin/use-admin-preferences";
import { UiText, useT } from "@/core/i18n/provider";
import { isManagementRoute } from "@/core/auth/routes";
import { checkedPreviewPage } from "@/core/pages/preview-validation";
import { checkedLiveContent } from "@/core/preview/content";
import {
  livePreviewPath,
  previewEditorPath,
  type PreviewKind,
} from "@/core/preview/routes";
import { RouteLink } from "../components/ui/route-link";
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
  const latest = useRef<object | null>(null);
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
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === view.current?.contentWindow &&
        event.data?.type === "everunfold:focus-editor" &&
        event.data.id === id
      ) {
        setMobile("editor");
        editor.current?.contentWindow?.focus();
        return;
      }
      if (event.origin !== window.location.origin) return;
      if (event.source === editor.current?.contentWindow) {
        if (
          event.data?.type === "everunfold:embedded-location" &&
          typeof event.data.path === "string"
        ) {
          const url = new URL(event.data.path, window.location.origin);
          if (
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
          return;
        }
        const valid =
          kind === "page"
            ? event.data?.type === "everunfold:page-preview" &&
              checkedPreviewPage(event.data.page, id)
            : event.data?.type === "everunfold:content-preview" &&
              checkedLiveContent(event.data.content, kind, id);
        if (!valid) return;
        latest.current = event.data;
        view.current?.contentWindow?.postMessage(
          event.data,
          window.location.origin,
        );
      } else if (
        event.source === view.current?.contentWindow &&
        event.data?.id === id &&
        [
          "everunfold:page-preview-ready",
          "everunfold:content-preview-ready",
        ].includes(event.data.type)
      ) {
        if (latest.current)
          view.current?.contentWindow?.postMessage(
            latest.current,
            window.location.origin,
          );
        editor.current?.contentWindow?.postMessage(
          { type: "everunfold:request-preview", id },
          window.location.origin,
        );
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [kind, id, editPath]);
  return (
    <div
      className={`admin-root ${styles.workspace}`}
      data-surface="admin"
      data-admin-mode={preferences.mode}
      data-admin-motion={preferences.motion}
    >
      <header className={styles.toolbar}>
        <RouteLink
          className="admin-button"
          href={editPath}
          title={t("完整编辑器")}
          aria-label={t("完整编辑器")}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="logout" />
          <span className={styles.fullEditorLabel}>
            <UiText text="完整编辑器" />
          </span>
        </RouteLink>
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
        <section className={styles.view} data-device={device}>
          <iframe
            ref={view}
            name={`everunfold-live-preview-${id}`}
            src={previewPath}
            title={t("前台实时预览")}
          />
        </section>
      </div>
    </div>
  );
}
