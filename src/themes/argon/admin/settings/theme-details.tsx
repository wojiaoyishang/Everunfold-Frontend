"use client";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { InstalledTheme } from "@/core/contracts/settings";
import { useSettingsEditor } from "@/core/settings/editor";
import { UiText, useT } from "@/core/i18n/provider";
import { surfacePortalTarget } from "@/core/themes/portal";
import { useDialogSurface } from "../../hooks/use-dialog-surface";
import { useDialogDismiss } from "../../hooks/use-dialog-dismiss";
import { Button, Dialog } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { ThemeInformation, ThemePreview } from "./theme-information";
import styles from "./theme-details.module.css";

export function ThemeDetails({
  theme,
  onClose,
}: {
  theme: InstalledTheme | null;
  onClose: () => void;
}) {
  const editor = useSettingsEditor(),
    t = useT(),
    titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null),
    close = useRef<HTMLButtonElement>(null),
    inFlight = useRef(false);
  const [pending, setPending] = useState(false),
    [tried, setTried] = useState(false);
  const [unexpected, setUnexpected] = useState("");
  const { closing, dismiss } = useDialogDismiss(dialog);
  useDialogSurface(dialog, close);
  const selected =
    (editor.saved?.value.extensions?.theme ?? "") === (theme?.id ?? "");
  const working = editor.busy || pending;
  const leave = () => {
    if (!working && !inFlight.current) dismiss(onClose);
  };
  const activate = async () => {
    if (working || closing || selected || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setTried(true);
    setUnexpected("");
    let success = false;
    try {
      success = await editor.activateTheme(theme?.id ?? "");
      if (success) dismiss(onClose);
    } catch {
      setUnexpected("主题未能启用，请稍后重试。");
    } finally {
      if (!success) {
        inFlight.current = false;
        setPending(false);
      }
    }
  };
  return createPortal(
    <Dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-busy={working}
      data-state={closing ? "closing" : "open"}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        leave();
      }}
    >
      <header className={styles.header}>
        <div>
          <small>
            <UiText text="主题详情" />
          </small>
          <h2 id={titleId}>{theme?.title ?? t("实例默认")}</h2>
        </div>
        <Button
          ref={close}
          className="admin-icon-button"
          aria-label={t("关闭主题详情")}
          disabled={working || closing}
          onClick={leave}
        >
          <Icon name="close" />
        </Button>
      </header>
      <div className={styles.body}>
        {theme ? (
          <>
            <div className={styles.preview}>
              <ThemePreview key={theme.preview} source={theme.preview} />
            </div>
            {theme.description && (
              <p className={styles.description}>
                <UiText text={theme.description} />
              </p>
            )}
            <ThemeInformation theme={theme} />
          </>
        ) : (
          <p className={styles.description}>
            <UiText text="恢复跟随部署中设定的默认主题。" />
          </p>
        )}
        <p className={styles.hint}>
          <UiText text="启用只保存主题选择，其他未保存的设置会保留。" />
        </p>
        {(unexpected || (tried && editor.error)) && (
          <p role="alert" className={styles.error}>
            <UiText text={unexpected || editor.error} />
          </p>
        )}
      </div>
      <footer className={styles.footer}>
        <Button
          className="admin-button"
          disabled={working || closing}
          onClick={leave}
        >
          <UiText text="取消" />
        </Button>
        <Button
          className="admin-button admin-button-primary"
          disabled={working || closing || selected}
          onClick={() => void activate()}
        >
          <Icon name={working ? "refresh" : "check"} />
          <UiText
            text={
              working
                ? "正在启用…"
                : selected
                  ? "已启用"
                  : theme
                    ? "启用主题"
                    : "使用实例默认"
            }
          />
        </Button>
      </footer>
    </Dialog>,
    surfacePortalTarget(),
  );
}
