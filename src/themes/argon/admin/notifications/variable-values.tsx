"use client";

import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./notifications.module.css";

export const notificationSampleValues: Record<string, string> = {
  "actor.name": "小灵",
  "content.excerpt": "这是一条刚刚提交、正在等待审核的评论。",
  "resource.title": "示例文章",
  "resource.url": "/posts/example",
  "resource.review_url": "/admin/comments",
};

export function NotificationVariableValues({
  variables,
  values,
  onChange,
  onReset,
  disabled,
}: {
  variables: string[];
  values: Record<string, string>;
  onChange: (variable: string, value: string) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <section className={styles.variableFill}>
      <div className={styles.variableFillHeading}>
        <span>
          <UiText text="仅影响预览，不写入模板" />
        </span>
        <Button
          className={styles.variableReset}
          disabled={disabled}
          onClick={onReset}
        >
          <Icon name="undo" />
          <UiText text="恢复示例" />
        </Button>
      </div>
      <div className={styles.variableFillList}>
        {variables.map((variable) => (
          <label key={variable}>
            <span>{`{{${variable}}}`}</span>
            <TextField
              value={values[variable] ?? ""}
              aria-label={t("填充变量 {variable}", { variable })}
              placeholder={t("按事件提供")}
              disabled={disabled}
              onChange={(event) => onChange(variable, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
