"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import { copyText } from "@/core/browser/clipboard";
import {
  readMaintenanceHealth,
  readMaintenanceHistory,
  type MaintenanceHealth,
  type MaintenanceReceipt,
} from "@/core/contracts/maintenance";
import { dateLabel } from "@/core/date-time";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { useToast } from "../../components/ui/toast/toast-provider";
import { MaintenanceExport } from "./maintenance-export";
import {
  MaintenanceCountSummary,
  MaintenanceImport,
} from "./maintenance-import";
import { healthChecks, healthStatuses } from "./maintenance-labels";
import { SettingsSectionLink } from "./section-navigation";
import { SettingsSection } from "./shared";
import styles from "./maintenance.module.css";

const readTimeout = 30000;
const healthFailure = () => "暂时无法读取站点健康状态。";
const historyFailure = () => "暂时无法读取导入记录。";

function MaintenanceHealthSection() {
  const { baseUrl } = useAdminRequest();
  const [health, setHealth] = useState<MaintenanceHealth | null>(null);
  const action = useAccountAction(healthFailure);
  const toast = useToast();
  const toastId = useId();
  const t = useT();
  const refresh = () =>
    action.run(async (signal) => {
      const { data } = await readMaintenanceHealth(baseUrl, {
        signal,
        timeoutMs: readTimeout,
      });
      if (!signal.aborted) setHealth(data);
    }, "");
  const initialRead = useEffectEvent(() => {
    void refresh();
  });
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) initialRead();
    });
    return () => {
      mounted = false;
    };
  }, [baseUrl]);

  async function copyReport() {
    if (!health) return;
    try {
      // Only controlled check identifiers, status values, and the check time belong in the report.
      const checks = health.checks.map(({ id, status }) => ({ id, status }));
      await copyText(
        JSON.stringify({ checked_at: health.checked_at, checks }, null, 2),
      );
      toast.show({
        id: toastId,
        title: t("脱敏报告已复制"),
        tone: "success",
        placement: "top-center",
        countdown: true,
        duration: 4500,
      });
    } catch {
      toast.show({
        id: toastId,
        title: t("复制未完成，请重试。"),
        tone: "error",
        placement: "top-center",
        countdown: true,
        duration: 6500,
      });
    }
  }

  return (
    <SettingsSection
      id="maintenance-health"
      title="站点健康"
      group="站点维护"
      action={
        <div className={styles.actions}>
          <Button
            className="admin-button"
            disabled={action.busy}
            onClick={() => void refresh()}
          >
            <Icon name="refresh" />
            <UiText text={action.busy ? "正在检查…" : "重新检查"} />
          </Button>
          <Button
            className="admin-button"
            disabled={!health || action.busy}
            onClick={() => void copyReport()}
          >
            <Icon name="copy" />
            <UiText text="复制脱敏报告" />
          </Button>
        </div>
      }
    >
      {action.message && (
        <p className={styles.error} role="alert">
          <UiText text={action.message} />
        </p>
      )}
      {!health && !action.message && (
        <p className={styles.muted} role="status">
          <UiText text="正在读取站点健康状态…" />
        </p>
      )}
      {health && (
        <>
          <ul className={styles.rows}>
            {health.checks.map(({ id, status, detail }) => {
              const check = healthChecks[id];
              const presentation = healthStatuses[status];
              const link = "href" in check ? check.href : undefined;
              const Link = link?.startsWith("#")
                ? SettingsSectionLink
                : RouteLink;
              return (
                <li key={id} className={styles.row}>
                  <div className={styles.rowBody}>
                    {link ? (
                      <Link className={styles.link} href={link}>
                        <UiText text={check.label} />
                      </Link>
                    ) : (
                      <strong>
                        <UiText text={check.label} />
                      </strong>
                    )}
                    {detail && (
                      <small className={styles.muted}>
                        <UiText text={detail} />
                      </small>
                    )}
                  </div>
                  <span
                    className="admin-badge admin-status-badge"
                    data-tone={presentation.tone}
                  >
                    <UiText text={presentation.label} />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={styles.muted}>
            <UiText text="最近检查" />{" "}
            <time dateTime={health.checked_at}>
              {dateLabel(health.checked_at)}
            </time>
          </p>
        </>
      )}
    </SettingsSection>
  );
}

function MaintenanceData() {
  const { baseUrl } = useAdminRequest();
  const [receipts, setReceipts] = useState<MaintenanceReceipt[] | null>(null);
  const action = useAccountAction(historyFailure);
  const refresh = () =>
    action.run(async (signal) => {
      const { data } = await readMaintenanceHistory(baseUrl, {
        signal,
        timeoutMs: readTimeout,
      });
      if (!signal.aborted)
        setReceipts((current) => {
          if (!current) return data.items;
          // An import can finish while a previously issued history request is pending.
          // An already-confirmed newer receipt remains visible in that case.
          const newest = data.items[0]?.created_at;
          const newer = current.filter(
            (item) =>
              (!newest || Date.parse(item.created_at) >= Date.parse(newest)) &&
              !data.items.some(({ id }) => id === item.id),
          );
          return [...newer, ...data.items];
        });
    }, "");
  const initialRead = useEffectEvent(() => {
    void refresh();
  });
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) initialRead();
    });
    return () => {
      mounted = false;
    };
  }, [baseUrl]);

  return (
    <>
      <MaintenanceExport />
      <MaintenanceImport
        onImported={(receipt) => {
          setReceipts((items) => [
            receipt,
            ...(items ?? []).filter(({ id }) => id !== receipt.id),
          ]);
          void refresh();
        }}
      />
      <SettingsSection
        id="maintenance-history"
        title="导入记录"
        group="站点维护"
        action={
          <Button
            className="admin-button"
            disabled={action.busy}
            onClick={() => void refresh()}
          >
            <Icon name="refresh" />
            <UiText text="刷新" />
          </Button>
        }
      >
        {action.message && (
          <p className={styles.error} role="alert">
            <UiText text={action.message} />
          </p>
        )}
        {!receipts && !action.message && (
          <p className={styles.muted} role="status">
            <UiText text="正在读取导入记录…" />
          </p>
        )}
        {receipts?.length === 0 && (
          <p className={styles.muted}>
            <UiText text="暂无导入记录。" />
          </p>
        )}
        {!!receipts?.length && (
          <ul className={styles.rows}>
            {receipts.map((receipt) => (
              <li key={receipt.id} className={styles.row}>
                <time dateTime={receipt.created_at} title={receipt.id}>
                  {dateLabel(receipt.created_at)}
                </time>
                <MaintenanceCountSummary counts={receipt.counts} receipt />
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </>
  );
}

export function MaintenanceSections() {
  const { role } = useAdminAccount();
  return (
    <>
      <MaintenanceHealthSection />
      {role === "admin" && <MaintenanceData />}
    </>
  );
}
