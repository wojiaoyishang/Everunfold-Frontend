"use client";

import { useId, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import { downloadText } from "@/core/browser/download";
import {
  exportMaintenanceBundle,
  type MaintenanceExportRequest,
} from "@/core/contracts/maintenance";
import { RequestError } from "@/core/http/request";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Checkbox } from "../../components/ui/checkbox";
import { DateTimeField } from "../../components/ui/date-time-field";
import { Button, Form } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { useToast } from "../../components/ui/toast/toast-provider";
import { maintenanceKinds } from "./maintenance-labels";
import { SettingsSection } from "./shared";
import styles from "./maintenance.module.css";

type Kind = MaintenanceExportRequest["kinds"][number];
const kinds = Object.keys(maintenanceKinds) as Kind[];
const statuses = [
  { value: "", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" },
] as const;

function exportFailure(error: unknown) {
  if (error instanceof RequestError && error.status === 413)
    return "数据量超过单次导出上限，请缩小导出范围。";
  return "导出未完成，请重试。";
}

export function MaintenanceExport() {
  const request = useAdminRequest();
  const t = useT();
  const toast = useToast();
  const statusId = useId();
  const toastId = useId();
  const exportAction = useAccountAction(exportFailure);
  const [selected, setSelected] = useState<Kind[]>(() =>
    kinds.filter((kind) => kind !== "site"),
  );
  const [status, setStatus] = useState<(typeof statuses)[number]["value"]>("");
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const reversedDates = from !== null && to !== null && from > to;

  const download = async () => {
    if (!selected.length || reversedDates) return;
    await exportAction.run(async (signal) => {
      const { data } = await exportMaintenanceBundle(
        request.baseUrl,
        {
          kinds: selected,
          statuses: status ? [status] : null,
          date_from: from,
          date_to: to,
        },
        request.csrfToken,
        { signal, timeoutMs: 60000 },
      );
      if (signal.aborted) return;
      const stamp = data.exported_at.replace(/[^0-9]/g, "").slice(0, 14);
      downloadText(`everunfold-content-${stamp}.json`, JSON.stringify(data));
      toast.show({
        id: toastId,
        title: t("数据包已导出"),
        tone: "success",
        placement: "top-center",
        countdown: true,
        duration: 4500,
      });
    }, "");
  };

  return (
    <SettingsSection id="maintenance-export" title="数据导出" group="站点维护">
      <Form
        className={styles.fields}
        onSubmit={(event) => {
          event.preventDefault();
          void download();
        }}
      >
        <fieldset className={styles.options} disabled={exportAction.busy}>
          <legend>
            <UiText text="导出范围" />
          </legend>
          <div className={styles.checks}>
            {kinds.map((kind) => (
              <label key={kind} className={styles.check}>
                <Checkbox
                  checked={selected.includes(kind)}
                  onChange={() =>
                    setSelected(
                      selected.includes(kind)
                        ? selected.filter((item) => item !== kind)
                        : [...selected, kind],
                    )
                  }
                />
                <UiText text={maintenanceKinds[kind]} />
              </label>
            ))}
          </div>
        </fieldset>
        <div className={styles.filters}>
          <div className="admin-settings-field">
            <label htmlFor={statusId}>
              <UiText text="内容状态" />
            </label>
            <Select
              id={statusId}
              name={statusId}
              label="内容状态"
              value={status}
              programOptions
              disabled={exportAction.busy}
              options={[...statuses]}
              onValueChange={(value) => {
                const next = statuses.find((option) => option.value === value);
                if (next) setStatus(next.value);
              }}
            />
          </div>
          <div className="admin-settings-field">
            <span>
              <UiText text="修改时间起" />
            </span>
            <DateTimeField
              label={t("修改时间起")}
              value={from}
              onValueChange={setFrom}
              disabled={exportAction.busy}
            />
          </div>
          <div className="admin-settings-field">
            <span>
              <UiText text="修改时间止" />
            </span>
            <DateTimeField
              label={t("修改时间止")}
              value={to}
              onValueChange={setTo}
              disabled={exportAction.busy}
            />
          </div>
        </div>
        {reversedDates && (
          <p role="alert" className={styles.error}>
            <UiText text="结束时间须晚于或等于开始时间。" />
          </p>
        )}
        <div className={styles.actions}>
          <Button
            className="admin-button admin-button-primary"
            type="submit"
            disabled={exportAction.busy || !selected.length || reversedDates}
          >
            <Icon name={exportAction.busy ? "refresh" : "download"} />
            <UiText text={exportAction.busy ? "正在导出…" : "导出 JSON"} />
          </Button>
          <small className={styles.muted}>
            <UiText text="每份最多 2,000 条记录、16 MiB。媒体保留引用，原文件另存。" />
          </small>
        </div>
        {exportAction.message && (
          <p role="alert" className={styles.error}>
            <UiText text={exportAction.message} />
          </p>
        )}
      </Form>
    </SettingsSection>
  );
}
