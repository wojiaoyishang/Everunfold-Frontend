"use client";
import { useState } from "react";
import type { ManagedPageSummary } from "@/core/contracts/pages";
import { setPageEnabled } from "@/core/contracts/pages";
import { useAdminRequest, useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { useAccountAction } from "@/core/accounts/use-action";
import { pagesFailure } from "@/core/pages/failure";
import { UiText, useT } from "@/core/i18n/provider";
import { Switch } from "../../components/ui/switch";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import styles from "./pages.module.css";

export function PageEnabledControl({
  page,
  disabled,
  onChanged,
}: {
  page: ManagedPageSummary;
  disabled?: boolean;
  onChanged: () => void;
}) {
  const actor = useAdminAccount(),
    { baseUrl, csrfToken } = useAdminRequest(),
    t = useT();
  const [confirm, setConfirm] = useState(false);
  const action = useAccountAction(pagesFailure);
  const needsApply = !page.enabled && !page.has_applied_snapshot;
  const run = () =>
    action.run(async (signal) => {
      const input = {
        id: page.id,
        expected_revision: page.revision,
        enabled: !page.enabled,
        apply_draft: needsApply,
      };
      await setPageEnabled(
        baseUrl,
        { ...input, operation_id: action.operation(input) },
        csrfToken,
        { signal },
      );
      onChanged();
    }, "");
  return (
    <div className={styles.enableControl}>
      <span>
        <UiText text="启用" />
        <Switch
          aria-label={t("启用页面：{title}", { title: page.title })}
          checked={page.enabled}
          disabled={
            disabled ||
            action.busy ||
            page.archived ||
            !can(actor, "pages:publish") ||
            !can(actor, "pages:write") ||
            (page.applied_javascript_enabled && actor.role !== "admin") ||
            (!page.enabled && !page.available)
          }
          onCheckedChange={() => {
            if (needsApply) setConfirm(true);
            else void run();
          }}
        />
      </span>
      {!confirm && action.message && (
        <small role="alert">{action.message}</small>
      )}
      <ConfirmDialog
        open={confirm}
        title={
          page.enabled
            ? "停用页面？"
            : needsApply
              ? "应用草稿并启用页面？"
              : "启用页面？"
        }
        description={
          needsApply
            ? "此页面没有可恢复的已应用版本。继续将应用当前已保存的草稿并公开页面。"
            : "仅切换已应用页面的启用状态，尚未应用的草稿修改不会公开。"
        }
        confirmLabel={
          needsApply ? "应用并启用" : page.enabled ? "停用页面" : "启用页面"
        }
        busy={action.busy}
        error={action.message}
        onCancel={() => {
          setConfirm(false);
        }}
        onConfirm={run}
        onConfirmed={() => {
          setConfirm(false);
        }}
      />
    </div>
  );
}
