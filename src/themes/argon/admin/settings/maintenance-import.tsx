"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  applyMaintenanceImport,
  type MaintenanceCounts,
  type MaintenancePreview,
  type MaintenanceReceipt,
} from "@/core/contracts/maintenance";
import { RequestError } from "@/core/http/request";
import { UiText, useT } from "@/core/i18n/provider";
import { maintenanceImportQueue } from "@/core/maintenance/import-queue";
import { Icon } from "../../components/icon";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { FilePicker } from "../../components/ui/file-picker";
import { Button } from "../../components/ui/primitives";
import { useToast } from "../../components/ui/toast/toast-provider";
import { UploadQueueView } from "../../components/ui/upload-queue";
import { importStates, maintenanceKinds } from "./maintenance-labels";
import { SettingsSection } from "./shared";
import styles from "./maintenance.module.css";

type State = keyof MaintenanceCounts;
const states = Object.keys(importStates) as State[];
const pageSize = 20;

export function MaintenanceCountSummary({
  counts,
  receipt = false,
}: {
  counts: MaintenanceCounts;
  receipt?: boolean;
}) {
  return (
    <dl className={styles.counts}>
      {states.map((state) => (
        <div
          key={state}
          className="admin-badge admin-status-badge"
          data-tone={importStates[state].tone}
        >
          <dt>
            <UiText
              text={
                receipt && state === "create"
                  ? "已导入"
                  : importStates[state].label
              }
            />
          </dt>
          <dd>{counts[state]}</dd>
        </div>
      ))}
    </dl>
  );
}

function ImportPreview({ preview }: { preview: MaintenancePreview }) {
  const t = useT();
  const [state, setState] = useState<State | "">("");
  const [page, setPage] = useState(0);
  const items = state
    ? preview.items.filter((item) => item.state === state)
    : preview.items;
  const pageCount = Math.ceil(items.length / pageSize);
  return (
    <>
      <MaintenanceCountSummary counts={preview.counts} />
      <div className={styles.actions}>
        {[
          { value: "" as const, label: "全部" },
          ...states.map((value) => ({
            value,
            label: importStates[value].label,
          })),
        ].map(({ value, label }) => (
          <Button
            key={value}
            className="admin-button admin-action-button"
            data-tone={state === value ? "accent" : "neutral"}
            aria-pressed={state === value}
            onClick={() => {
              setState(value);
              setPage(0);
            }}
          >
            <UiText text={label} />
          </Button>
        ))}
      </div>
      {items.length ? (
        <ul className={styles.rows} aria-label={t("导入预览")}>
          {items
            .slice(page * pageSize, (page + 1) * pageSize)
            .map((item, index) => (
              <li
                key={`${item.kind}:${item.id}:${index}`}
                className={styles.row}
              >
                <div className={styles.rowBody}>
                  <strong>{item.title || "—"}</strong>
                  <small className={styles.muted}>
                    <UiText text={maintenanceKinds[item.kind]} />
                    {item.reason && (
                      <>
                        {" "}
                        · <UiText text={item.reason} />
                      </>
                    )}
                  </small>
                </div>
                <span
                  className="admin-badge admin-status-badge"
                  data-tone={importStates[item.state].tone}
                >
                  <UiText text={importStates[item.state].label} />
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <p className={styles.muted}>
          <UiText text="没有符合此状态的记录。" />
        </p>
      )}
      {pageCount > 1 && (
        <div className={styles.actions}>
          <Button
            className="admin-button"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <UiText text="上一页" />
          </Button>
          <span className={styles.muted} aria-live="polite">
            {page + 1} / {pageCount}
          </span>
          <Button
            className="admin-button"
            disabled={page + 1 === pageCount}
            onClick={() => setPage(page + 1)}
          >
            <UiText text="下一页" />
          </Button>
        </div>
      )}
    </>
  );
}

const activeStates = new Set(["queued", "uploading", "saving"]);

export function MaintenanceImport({
  onImported,
}: {
  onImported: (receipt: MaintenanceReceipt) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const queue = useMemo(
    () => maintenanceImportQueue(baseUrl, csrfToken),
    [baseUrl, csrfToken],
  );
  const entries = useSyncExternalStore(
    queue.subscribe,
    queue.snapshot,
    queue.snapshot,
  );
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [receipt, setReceipt] = useState<MaintenanceReceipt | null>(null);
  const apply = useRef<AbortController | null>(null);
  const picker = useRef<HTMLButtonElement>(null);
  const t = useT();
  const toast = useToast();
  const toastId = useId();
  const plan = entries.at(-1)?.result;
  const canImport = !!plan?.preview.counts.create && !stale;

  useEffect(() => {
    queue.start();
    return () => {
      queue.dispose();
      apply.current?.abort();
    };
  }, [queue]);

  const importBundle = async () => {
    if (!plan || !canImport || apply.current) return false;
    const controller = new AbortController();
    apply.current = controller;
    setError("");
    try {
      const { data } = await applyMaintenanceImport(
        baseUrl,
        { bundle: plan.bundle, digest: plan.preview.digest },
        csrfToken,
        { signal: controller.signal, timeoutMs: 60000 },
      );
      if (controller.signal.aborted) return false;
      setReceipt(data);
      onImported(data);
      return true;
    } catch (cause) {
      if (controller.signal.aborted) return false;
      if (cause instanceof RequestError && cause.status === 409) {
        setStale(true);
        setError("站点数据已变化，请关闭窗口并重新选择数据包预览。");
      } else {
        setError("导入结果未能确认，可在此重试或查看导入记录。");
      }
      return false;
    } finally {
      if (apply.current === controller) apply.current = null;
    }
  };

  function clearPlan() {
    queue.clearFinished();
    setError("");
    setStale(false);
  }

  return (
    <SettingsSection
      id="maintenance-import"
      title="数据导入"
      group="站点维护"
      description="先预览再导入。新正文以草稿保存，冲突项会跳过。"
    >
      <div className={styles.actions}>
        <FilePicker
          ref={picker}
          accept=".json,application/json"
          className="admin-button"
          multiple={false}
          label="选择数据包"
          display={<UiText text="选择数据包" />}
          disabled={
            confirm || entries.some((entry) => activeStates.has(entry.state))
          }
          onFiles={(files) => {
            if (files.length !== 1) {
              toast.show({
                id: toastId,
                title: t("每次请选择一个数据包。"),
                tone: "error",
                placement: "top-center",
                countdown: true,
                duration: 6000,
              });
              return;
            }
            clearPlan();
            setReceipt(null);
            queue.add(files, "maintenance");
          }}
        />
        {plan && (
          <Button
            className="admin-button admin-button-primary"
            disabled={!canImport}
            onClick={() => {
              setError("");
              setConfirm(true);
            }}
          >
            <Icon name="check" />
            <UiText text="确认导入" />
          </Button>
        )}
      </div>
      {!!entries.length && (
        <div className={styles.upload}>
          <UploadQueueView
            items={entries}
            onCancel={(id) => queue.cancel(id)}
            onRetry={(id) => queue.retry(id)}
            onClear={clearPlan}
            completedLabel="已生成预览"
            processingLabel="正在生成预览…"
          />
        </div>
      )}
      {receipt && (
        <div className={styles.fields} role="status">
          <strong>
            <UiText text="导入完成" />
          </strong>
          <MaintenanceCountSummary counts={receipt.counts} receipt />
        </div>
      )}
      {plan && (
        <ImportPreview key={entries.at(-1)?.id} preview={plan.preview} />
      )}
      <ConfirmDialog
        open={confirm}
        title="导入站点数据？"
        description={
          plan && (
            <>
              <p>
                <UiText text="新正文将保存为草稿。现有记录会保留。" />
              </p>
              <MaintenanceCountSummary counts={plan.preview.counts} />
            </>
          )
        }
        confirmLabel="导入"
        confirmIcon="upload"
        busyLabel="正在导入…"
        confirmDisabled={!canImport}
        error={error}
        onConfirm={importBundle}
        onCancel={() => {
          setConfirm(false);
          if (stale) requestAnimationFrame(() => picker.current?.focus());
        }}
        onConfirmed={() => {
          setConfirm(false);
          clearPlan();
          requestAnimationFrame(() => picker.current?.focus());
          toast.show({
            id: toastId,
            title: t("导入完成"),
            tone: "success",
            placement: "top-center",
            countdown: true,
            duration: 4500,
          });
        }}
      />
    </SettingsSection>
  );
}
