"use client";
import { randomUUID } from "@/core/browser/crypto";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./primitives";
import { Icon } from "../icon";

type Tone = "success" | "error";
const FeedbackContext = createContext<
  ((text: string, tone?: Tone) => void) | null
>(null);

/** One theme-wide live region; async feedback never occupies article layout space. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{
    id: string;
    text: string;
    tone: Tone;
    visible: boolean;
  } | null>(null);
  const notify = useCallback((text: string, tone: Tone = "success") => {
    setNotice({ id: randomUUID(), text, tone, visible: true });
  }, []);
  useEffect(() => {
    if (!notice) return;
    const { id, visible, tone } = notice;
    const timer = setTimeout(
      () =>
        setNotice((current) => {
          if (current?.id !== id) return current;
          return visible ? { ...current, visible: false } : null;
        }),
      visible ? (tone === "error" ? 6000 : 3000) : 220,
    );
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <div
        className="ui-feedback-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice && (
          <div
            key={notice.id}
            className="ui-feedback"
            data-tone={notice.tone}
            data-visible={notice.visible}
          >
            <Icon name={notice.tone === "success" ? "check" : "close"} />
            <span>{notice.text}</span>
            <Button
              className="icon-button"
              aria-label="关闭提示"
              onClick={() =>
                setNotice(
                  (current) => current && { ...current, visible: false },
                )
              }
            >
              <Icon name="close" />
            </Button>
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const notify = useContext(FeedbackContext);
  if (!notify) throw new Error("Feedback requires the shared theme provider");
  return notify;
}
