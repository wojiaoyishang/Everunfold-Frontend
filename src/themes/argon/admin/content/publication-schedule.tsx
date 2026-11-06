"use client";

import { UiText, useLocale } from "@/core/i18n/provider";
import type { DraftDetail } from "@/generated/content-admin-contract";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { DateTimeField } from "../../components/ui/date-time-field";
import { Icon } from "../../components/icon";
import styles from "./editor-workspace.module.css";

export interface PublicationChoice {
  enabled: boolean;
  at: string | null;
}
export interface PublicationScheduleProps {
  choice: PublicationChoice;
  onChange: (value: PublicationChoice) => void;
  onCancel: () => void;
  disabled: boolean;
}
export function PublicationSchedule({
  detail,
  choice,
  onChange,
  onCancel,
  disabled,
}: PublicationScheduleProps & { detail: DraftDetail | null }) {
  const { uiLocale } = useLocale();
  return (
    <div className={styles.scheduleFields}>
      {detail?.scheduled_for && (
        <div className={styles.scheduleNotice} role="status">
          <Icon name="clock" />
          <div>
            <strong>
              <UiText text="已安排定时发布" />
            </strong>
            <time dateTime={detail.scheduled_for}>
              {new Intl.DateTimeFormat(uiLocale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(detail.scheduled_for))}
            </time>
            <small>
              <UiText text="发布版本" /> V{detail.scheduled_revision}
            </small>
            <Button
              className={styles.cancelSchedule}
              disabled={disabled}
              onClick={onCancel}
            >
              <Icon name="close" />
              <UiText text="取消定时发布" />
            </Button>
          </div>
        </div>
      )}
      {detail?.schedule_error && (
        <div className={styles.scheduleFailure} role="alert">
          <strong>
            <UiText text="定时发布失败" />
          </strong>
          <small>
            <UiText
              text={
                detail.schedule_error === "permission_changed"
                  ? "发布人的账号或权限已变化，请由有发布权限的成员重新安排。"
                  : detail.schedule_error === "path_conflict"
                    ? "预定地址已被占用，请修改路径后重新安排。"
                    : "预定内容或媒体未通过校验，请检查后重新安排。"
              }
            />
          </small>
        </div>
      )}
      <div className="admin-field">
        <span>
          <UiText text="发布方式" />
        </span>
        <Select
          name="content-publication-mode"
          label="发布方式"
          programOptions
          value={choice.enabled ? "scheduled" : "immediate"}
          disabled={disabled || !detail}
          options={[
            { value: "immediate", label: "立即发布" },
            { value: "scheduled", label: "定时发布" },
          ]}
          onValueChange={(value) =>
            onChange({ ...choice, enabled: value === "scheduled" })
          }
        />
      </div>
      {choice.enabled && (
        <div className="admin-field">
          <span>
            <UiText text="定时发布时间" />
          </span>
          <DateTimeField
            label="定时发布时间"
            value={choice.at}
            disabled={disabled}
            onValueChange={(at) => onChange({ ...choice, at })}
          />
          <small>
            <UiText text="按当前设备时区填写。点击安排发布后冻结本次版本，后续编辑保留为草稿。" />
          </small>
        </div>
      )}
    </div>
  );
}
