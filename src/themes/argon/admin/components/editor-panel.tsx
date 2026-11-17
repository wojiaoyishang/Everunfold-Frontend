"use client";

import { useId, useState, type ReactNode } from "react";
import { UiText } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import styles from "../content/editor-workspace.module.css";

export function EditorPanel({
  title,
  children,
  initialOpen = true,
  defer = false,
}: {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  defer?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(initialOpen);
  const [mounted, setMounted] = useState(!defer || initialOpen);
  return (
    <section className={styles.panel}>
      <Button
        className={styles.panelHeading}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!open && !mounted) setMounted(true);
          setOpen(!open);
        }}
      >
        <UiText text={title} />
        <Icon name="chevron" />
      </Button>
      <div
        id={id}
        className={styles.panelReveal}
        data-open={open}
        inert={!open}
      >
        <div>
          <div className={styles.panelBody}>{mounted && children}</div>
        </div>
      </div>
    </section>
  );
}
