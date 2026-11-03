"use client";
import { useEffect, useRef, useState } from "react";
import type { SourceAcquired } from "@/generated/collaboration-contract";
import { useFontLibrary } from "@/core/media/font-library";
import { Button } from "../../../components/ui/primitives";
import { DownloadButton } from "../../../components/ui/download-button";
import { RichTextEditor } from "../../../components/ui/rich-text-editor";
import { Icon } from "../../../components/icon";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { Checkbox } from "../../../components/ui/checkbox";
import type { BlockEditorProps } from "./source-block-editor";
import HtmlSourceEditor from "./html-source";
import { RichToolbar } from "./rich-toolbar";
import styles from "./rich-editor.module.css";
import { useEditorView } from "../../../hooks/use-editor-view";

export default function HtmlEditor(props: BlockEditorProps) {
  const {
    view: mode,
    ref: viewRef,
    exiting,
    change: changeView,
  } = useEditorView<"visual" | "source">("visual");
  const [source, setSource] = useState("");
  const [original, setOriginal] = useState("");
  const [review, setReview] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [lease, setLease] = useState<SourceAcquired | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const fonts = useFontLibrary();
  const host = props.shared?.host,
    blockId = props.shared?.blockId ?? "";
  const locked = Boolean(host?.sources.locked(blockId) && mode !== "source");
  const staging = useRef(props.onStaging);
  useEffect(() => {
    staging.current = props.onStaging;
  }, [props.onStaging]);
  useEffect(
    () => () => {
      staging.current?.(false);
    },
    [],
  );
  useEffect(() => {
    if (!host || !lease) return;
    return () => {
      // Keep staged source for this tab, but promptly release an abandoned view.
      // A disconnected browser is covered by the server's expiring lease.
      void host.sources.release(blockId, lease.lease_id, false).catch(() => {});
    };
  }, [host, blockId, lease]);
  useEffect(() => {
    if (!host || !lease || mode !== "source") return;
    const timer = setInterval(() => {
      void host.sources
        .renew(blockId, lease.lease_id)
        .catch(() =>
          setError("暂时无法续期，源码仍保留。恢复连接后请检查编辑权再应用。"),
        );
    }, 20000);
    return () => {
      clearInterval(timer);
    };
  }, [host, blockId, lease, mode]);
  const openSource = async () => {
    if (busy || props.disabled || locked) return;
    setBusy(true);
    setError("");
    try {
      const acquired = host ? await host.sources.acquire(blockId) : null;
      const html = acquired?.html ?? props.value;
      const recovered = host?.sources.drafts.get(blockId);
      setLease(acquired);
      setOriginal(html);
      setSource(recovered ?? html);
      setReview(recovered !== undefined && recovered !== html ? html : null);
      setReviewed(false);
      changeView("source");
      staging.current?.(true);
      if (recovered !== undefined && recovered !== html)
        setError(
          "发现未应用的本地源码。请与服务器当前正文核对后再应用；可以先下载保存。",
        );
    } catch {
      setError(
        "暂时无法取得源码编辑权。请等待同步，或确认其他编辑者已经退出源码模式。",
      );
    } finally {
      setBusy(false);
    }
  };
  const closeSource = async () => {
    setBusy(true);
    try {
      if (host && lease) await host.sources.release(blockId, lease.lease_id);
      changeView("visual", () => {
        setLease(null);
        staging.current?.(false);
      });
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "暂时无法退出源码模式，请重试。",
      );
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (source === original) {
      await closeSource();
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (host && lease) await host.sources.apply(blockId, lease, source);
      else props.onChange(source);
      changeView("visual", () => {
        setLease(null);
        staging.current?.(false);
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "应用失败，源码仍保留。",
      );
    } finally {
      setBusy(false);
    }
  };
  const pending = Boolean(host?.sources.hasPending(blockId));
  return (
    <div>
      <div className={styles.modeBar}>
        <div className={styles.tabs} aria-label="HTML 编辑模式">
          <Button
            aria-pressed={mode === "visual"}
            disabled={busy}
            onClick={() => {
              if (mode === "source") {
                if (source !== original) setConfirm(true);
                else void closeSource();
              }
            }}
          >
            <Icon name="eye" />
            可视化
          </Button>
          <Button
            aria-pressed={mode === "source"}
            disabled={props.disabled || busy || locked}
            onClick={() => {
              if (mode !== "source") void openSource();
            }}
          >
            <Icon name="code" />
            HTML
          </Button>
        </div>
        <small>
          {busy
            ? "正在处理…"
            : mode === "source"
              ? "应用后更新共享正文"
              : "可视化排版"}
        </small>
      </div>
      {locked && (
        <div className={styles.notice}>
          <Icon name="lock" />
          此块正在编辑 HTML 源码，其他正文块可以继续编辑。
        </div>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          {error}
        </div>
      )}
      <div
        className={styles.view}
        key={mode}
        ref={viewRef}
        data-exiting={exiting}
        inert={exiting}
      >
        {mode === "visual" ? (
          <RichTextEditor
            value={props.value}
            label={props.label}
            disabled={props.disabled || locked || busy}
            onChange={props.onChange}
            shared={props.shared}
            editorRef={props.editorRef}
            media={props.media}
            toolbar={(editor) => (
              <RichToolbar editor={editor} fonts={fonts.items} />
            )}
          />
        ) : (
          <>
            {review !== null && (
              <div className={styles.review}>
                <strong>当前共享源码</strong>
                <pre tabIndex={0}>{review}</pre>
                <label>
                  <Checkbox
                    checked={reviewed}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />
                  已核对当前正文和下方恢复的本地源码
                </label>
              </div>
            )}
            <HtmlSourceEditor
              value={source}
              onChange={(html) => {
                setSource(html);
                try {
                  host?.sources.setDraft(blockId, html);
                } catch {
                  setError("本地源码备份未成功，请下载源码后再离开。");
                }
              }}
              label={props.label + " HTML 源码"}
              disabled={busy || pending}
              editorRef={props.editorRef}
            />
            <div className={styles.sourceActions}>
              <span>源码暂存于本页，应用前不改变共享正文。</span>
              <div>
                <DownloadButton
                  className="admin-button"
                  filename="html-block.html"
                  content={() => source}
                  mime="text/html;charset=utf-8"
                >
                  <Icon name="download" />
                  下载源码
                </DownloadButton>
                <Button
                  className="admin-button"
                  disabled={busy || pending}
                  onClick={() =>
                    source !== original ? setConfirm(true) : void closeSource()
                  }
                >
                  取消
                </Button>
                <Button
                  className="admin-button admin-button-primary"
                  disabled={
                    busy || props.disabled || (review !== null && !reviewed)
                  }
                  onClick={() => void apply()}
                >
                  <Icon name="check" />
                  {pending ? "重试应用" : "应用并返回"}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirm}
        title="放弃这次源码修改？"
        description="尚未应用的源码将被丢弃，共享正文保持当前内容。"
        confirmLabel="放弃修改"
        cancelLabel="继续编辑"
        onCancel={() => setConfirm(false)}
        onConfirm={() => true}
        onConfirmed={() => {
          setConfirm(false);
          void closeSource();
        }}
      />
    </div>
  );
}
