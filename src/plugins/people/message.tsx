"use client";
import { surfacePortalTarget } from "@/core/themes/portal";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { UiText, useT } from "@/core/i18n/provider";
import { Avatar } from "@/themes/argon/components/ui/avatar";
import { Button, Dialog } from "@/themes/argon/components/ui/primitives";
import { Icon } from "@/themes/argon/components/icon";
import { useDialogSurface } from "@/themes/argon/hooks/use-dialog-surface";
import { useDialogDismiss } from "@/themes/argon/hooks/use-dialog-dismiss";
import { useMotion } from "@/themes/argon/hooks/use-motion";
import styles from "./message.module.css";

function OpeningFireworks() {
  const { enabled } = useMotion();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, []);
  if (!enabled || !visible) return null;
  return (
    <div className={styles.fireworks} aria-hidden="true" data-opening-fireworks>
      {[0, 1, 2].map((burst) => (
        <span className={styles.burst} key={burst}>
          {Array.from({ length: 16 }, (_, index) => {
            const angle = (index * Math.PI) / 8;
            const length = 55 + (index % 4) * 16;
            return (
              <i
                key={index}
                style={
                  {
                    "--dx": `${Math.cos(angle) * length}px`,
                    "--dy": `${Math.sin(angle) * length}px`,
                    "--delay": `${burst * 180}ms`,
                  } as CSSProperties
                }
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}

export function PeopleMessage({
  person,
  onClose,
}: {
  person: { name: string; group: string; message: string; avatar: string };
  onClose: () => void;
}) {
  const t = useT(),
    titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const { closing, dismiss } = useDialogDismiss(dialog);
  useDialogSurface(dialog, close);
  const finish = () => dismiss(onClose);
  return createPortal(
    <Dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      data-state={closing ? "closing" : "open"}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        finish();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          finish();
      }}
    >
      {!closing && <OpeningFireworks />}
      <Button
        ref={close}
        className={styles.dismiss}
        aria-label={t("关闭寄语")}
        onClick={finish}
        disabled={closing}
      >
        <Icon name="close" />
      </Button>
      <header className={styles.identity}>
        <Avatar name={person.name || "?"} src={person.avatar} size={76} />
        <h2 id={titleId}>{person.name || t("未命名")}</h2>
        {person.group && <span>{person.group}</span>}
      </header>
      <div className={styles.message}>
        <Icon name="quote" />
        <p>{person.message || t("还没有留下寄语。")}</p>
      </div>
      <footer>
        <Button className={styles.close} onClick={finish} disabled={closing}>
          <UiText text="收起寄语" />
        </Button>
      </footer>
    </Dialog>,
    surfacePortalTarget(),
  );
}
