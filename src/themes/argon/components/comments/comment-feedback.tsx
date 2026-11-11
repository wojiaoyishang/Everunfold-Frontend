"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useT } from "@/core/i18n/provider";
import { surfacePortalTarget } from "@/core/themes/portal";
import { afterDialogMotion } from "../../hooks/dialog-motion";
import { useMotion } from "../../hooks/use-motion";
import { Icon } from "../icon";
import { Button } from "../ui/primitives";
import styles from "./comment-feedback.module.css";

export interface CommentFeedbackProps {
  status: "checking" | "sending" | "success" | "error";
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

/** Keep comment results visible beside the site header, even after scrolling. */
export function CommentFeedback(props: CommentFeedbackProps) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <FeedbackSurface key={`${props.status}:${props.message}`} {...props} />,
    surfacePortalTarget(),
  );
}

function FeedbackSurface({
  status,
  message,
  onDismiss,
  onRetry,
}: CommentFeedbackProps) {
  const t = useT();
  const motion = useMotion();
  const surface = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const callback = useRef<(() => void) | null>(null);
  const pending = status === "checking" || status === "sending";
  const finish = useCallback((action: () => void) => {
    if (callback.current) return;
    callback.current = action;
    setClosing(true);
  }, []);
  useEffect(() => {
    if (status !== "success" || !onDismiss) return;
    const timer = window.setTimeout(() => finish(onDismiss), 10_000);
    return () => window.clearTimeout(timer);
  }, [finish, onDismiss, status]);
  useLayoutEffect(() => {
    if (closing)
      return afterDialogMotion(surface.current, () => callback.current?.());
  }, [closing]);
  return (
    <div
      ref={surface}
      className={styles.banner}
      data-status={status}
      data-state={closing ? "closing" : "open"}
      data-motion={motion.enabled ? "full" : "reduced"}
    >
      <div className={styles.inner}>
        <span className={styles.face} aria-hidden="true">
          {status === "error"
            ? "(╥﹏╥)"
            : status === "success"
              ? "(๑•̀ㅂ•́)و✧"
              : "(ง •̀_•́)ง"}
        </span>
        <span
          className={styles.message}
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {t(message)}
        </span>
        <div className={styles.actions}>
          {!pending && status === "error" && onRetry && (
            <Button
              className={styles.retry}
              disabled={closing}
              onClick={() => finish(onRetry)}
            >
              <Icon name="refresh" />
              {t("重试")}
            </Button>
          )}
          {!pending && onDismiss && (
            <Button
              className={styles.close}
              aria-label={t("关闭评论提示")}
              disabled={closing}
              onClick={() => finish(onDismiss)}
            >
              <Icon name="close" />
            </Button>
          )}
        </div>
      </div>
      <span
        className={styles.progress}
        role={pending ? "progressbar" : undefined}
        aria-label={pending ? t(message) : undefined}
        aria-hidden={pending ? undefined : true}
      >
        <span />
      </span>
    </div>
  );
}
