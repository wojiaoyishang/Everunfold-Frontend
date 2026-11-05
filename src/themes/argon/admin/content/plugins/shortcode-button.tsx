"use client";
import { UiText } from "@/core/i18n/provider";

import { Button } from "../../../components/ui/primitives";
import { Icon } from "../../../components/icon";
import styles from "./shortcode-button.module.css";

export function ShortcodeButton({
  className,
  disabled,
  onClick,
}: {
  className: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={`${className} ${styles.button}`}
      title="插入短代码"
      aria-label="插入短代码"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon name="shortcode" />
      <span>
        <UiText text="短代码" />
      </span>
    </Button>
  );
}
