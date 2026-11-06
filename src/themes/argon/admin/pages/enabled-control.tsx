"use client";
import { useState } from "react";
import type { ManagedPageSummary } from "@/generated/pages-contract";
import { setPageEnabled } from "@/generated/pages-client";
import { useAdminRequest, useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { useAccountAction } from "@/core/accounts/use-action";
import { pagesFailure } from "@/core/pages/failure";
import { UiText, useT } from "@/core/i18n/provider";
import { Switch } from "../../components/ui/switch";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { AccountField } from "../../account/fields";
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
  const [confirm, setConfirm] = useState(false),
    [password, setPassword] = useState("");
  const action = useAccountAction(pagesFailure);
  const needsApply = !page.enabled && !page.has_applied_snapshot;
  const run = () =>
    action.run(async (signal) => {
      const input = {
        id: page.id,
        expected_revision: page.revision,
        enabled: !page.enabled,
        apply_draft: needsApply,
        current_password: password,
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
            (page.enable_requires_password && actor.role !== "admin") ||
            (!page.enabled && !page.available)
          }
          onCheckedChange={() => {
            if (needsApply || page.enable_requires_password) setConfirm(true);
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
        confirmDisabled={page.enable_requires_password && !password}
        busy={action.busy}
        error={action.message}
        onCancel={() => {
          setConfirm(false);
          setPassword("");
        }}
        onConfirm={run}
        onConfirmed={() => {
          setConfirm(false);
          setPassword("");
        }}
      >
        {page.enable_requires_password && (
          <AccountField
            label="当前管理员密码"
            value={password}
            onChange={setPassword}
            secret
            autoComplete="current-password"
          />
        )}
      </ConfirmDialog>
    </div>
  );
}
