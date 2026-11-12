"use client";

import { useState, type RefObject } from "react";
import type { MailBrand } from "@/core/contracts/notifications";
import { UiText } from "@/core/i18n/provider";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { TextField } from "../../components/ui/primitives";
import styles from "./notifications.module.css";

const fields = [
  {
    name: "site_url",
    label: "公开站点地址",
    type: "url",
    placeholder: "https://example.com",
  },
  { name: "icon_url", label: "邮件图标地址", type: "url" },
  { name: "support_url", label: "邮件帮助链接", type: "url" },
  { name: "accent_color", label: "邮件主题色", type: "text" },
] as const;

export function MailBrandDialog({
  brand,
  site,
  busy,
  error,
  returnFocus,
  onClose,
  onSave,
}: {
  brand: MailBrand;
  site: Record<string, string>;
  busy: boolean;
  error: string;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSave: (value: MailBrand) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(brand);

  return (
    <ConfirmDialog
      open
      title="邮件品牌"
      description="邮件使用站点设置中的名称。图标和主题色留空时沿用站点设置。"
      icon="mail"
      busy={busy}
      error={error}
      submitOnEnter
      confirmLabel="保存"
      returnFocus={returnFocus}
      onCancel={onClose}
      onConfirmed={onClose}
      onConfirm={() => onSave(draft)}
    >
      <div className={styles.brandFields}>
        {fields.map((field) => (
          <label key={field.name} className={styles.toolbarField}>
            <UiText text={field.label} />
            <TextField
              type={field.type}
              value={draft[field.name] ?? ""}
              maxLength={field.name === "accent_color" ? 7 : 2048}
              placeholder={
                site[field.name === "site_url" ? "url" : field.name] ||
                ("placeholder" in field ? field.placeholder : undefined)
              }
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  [field.name]: event.target.value,
                }))
              }
            />
          </label>
        ))}
        <small className={styles.muted}>
          <UiText text="请填写收件人可访问的站点地址，用于生成邮件中的评论审核链接。" />
        </small>
      </div>
    </ConfirmDialog>
  );
}
