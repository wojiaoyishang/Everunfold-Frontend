"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { ContentFeatures } from "@/core/rendering/features/model";
import { afterDialogMotion } from "../hooks/dialog-motion";
import { useDialogSurface } from "../hooks/use-dialog-surface";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
import { Button, Dialog } from "./ui/primitives";
import { ContentMarkupView } from "./content-markup-view";
import { useT } from "@/core/i18n/provider";

/** A native top-layer dialog avoids trapping an entire article inside a tiny tooltip. */
export function GlossaryExpandedDialog({
  title,
  path,
  html,
  features,
  onDismiss,
}: {
  title: string;
  path: string;
  html: string;
  features: ContentFeatures;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const t = useT();
  const [closing, setClosing] = useState(false);
  useDialogSurface(ref);
  useEffect(() => {
    if (closing) return afterDialogMotion(ref.current, onDismiss);
  }, [closing, onDismiss]);
  const dismiss = () => setClosing(true);
  return (
    <Dialog
      ref={ref}
      className="glossary-expanded-dialog"
      data-state={closing ? "closing" : "open"}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dismiss();
      }}
    >
      <div className="glossary-expanded-panel">
        <header>
          <div>
            <small>{t("术语 · 完整说明")}</small>
            <h2 id={heading}>{title}</h2>
          </div>
          <Button
            className="icon-button"
            aria-label={t("关闭完整术语说明")}
            disabled={closing}
            onClick={dismiss}
          >
            <Icon name="close" />
          </Button>
        </header>
        <div className="glossary-expanded-scroll">
          <ContentMarkupView
            className="article-content glossary-expanded-body"
            data-glossary-ignore
            html={html}
            features={features}
            codeTools={false}
          />
        </div>
        <footer>
          <AppLink href={path} target="_blank" rel="noopener noreferrer">
            {t("打开词条页面")} <Icon name="external" />
          </AppLink>
        </footer>
      </div>
    </Dialog>
  );
}
