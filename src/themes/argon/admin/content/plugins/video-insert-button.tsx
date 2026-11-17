"use client";

import { UiText } from "@/core/i18n/provider";
import { Icon } from "../../../components/icon";
import { ActionPopover } from "../../../components/ui/action-popover";
import { Button } from "../../../components/ui/primitives";
import styles from "../../media/video-fields.module.css";

export function VideoInsertButton({
  className,
  disabled,
  onOrdinary,
  onShortcode,
}: {
  className: string;
  disabled?: boolean;
  onOrdinary?: () => void;
  onShortcode: () => void;
}) {
  return (
    <ActionPopover
      label="插入视频"
      className={className}
      disabled={disabled}
      panelClassName={styles.menu}
      triggerContent={<Icon name="video" />}
    >
      {(close) => (
        <>
          {onOrdinary && (
            <Button
              className="admin-button"
              onClick={() => {
                close();
                onOrdinary();
              }}
            >
              <Icon name="video" />
              <UiText text="普通视频插入" />
            </Button>
          )}
          <Button
            className="admin-button"
            onClick={() => {
              close();
              onShortcode();
            }}
          >
            <Icon name="shortcode" />
            <UiText text="短代码视频插入" />
          </Button>
        </>
      )}
    </ActionPopover>
  );
}
