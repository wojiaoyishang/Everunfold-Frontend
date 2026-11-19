"use client";
import { AdminPagination } from "../components/admin-pagination";
import { useEffect, useState } from "react";
import type {
  AccountProfile,
  KeyList,
  KeyState,
} from "@/core/contracts/accounts";
import { readUserApiKeys, revokeUserApiKey } from "@/core/contracts/accounts";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { UiText, useLocale } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

export function ManagedUserSecurity({ user }: { user: AccountProfile }) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    { uiLocale: locale } = useLocale();
  const revoke = useAccountAction();
  const [keys, setKeys] = useState<KeyList | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1);
  const [remove, setRemove] = useState<KeyState | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    readUserApiKeys(
      baseUrl,
      user.id,
      { page, page_size: 20 },
      { signal: controller.signal },
    )
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setKeys(data);
          setError("");
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, user.id, refresh, page, user.auth_version]);
  return (
    <>
      <section className="account-card">
        <header className="account-card-heading">
          <div>
            <h2>
              <UiText text="用户的 API Key" />
            </h2>
            <p>
              <UiText text="仅显示名称、范围和状态，不能读取已有密钥明文。" />
            </p>
          </div>
          <Button
            className="admin-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            <UiText text="刷新" />
          </Button>
        </header>
        {error && (
          <p role="alert">
            <UiText text={error} />
          </p>
        )}
        {keys?.items.map((key) => (
          <div className="account-key-row" key={key.id}>
            <div className="account-key-info">
              <strong>{key.name}</strong>
              <p>
                {key.masked} · {key.application_name}
              </p>
              <p>
                {new Date(key.expires_at).toLocaleString(locale)} ·{" "}
                <UiText
                  text={
                    key.status === "active"
                      ? "可用"
                      : key.status === "expired"
                        ? "已到期"
                        : key.status === "revoked"
                          ? "已撤销"
                          : "当前授权不可用"
                  }
                />
              </p>
            </div>
            {!key.revoked_at && (
              <Button
                className="admin-button"
                onClick={() => {
                  revoke.setMessage("");
                  setRemove(key);
                }}
              >
                <UiText text="撤销 Key" />
              </Button>
            )}
          </div>
        ))}
        {keys && !keys.total && (
          <p className="account-empty">
            <UiText text="尚未创建 API Key。" />
          </p>
        )}
        {keys && keys.total > 20 && (
          <AdminPagination
            className="account-actions"
            page={page}
            pages={Math.ceil(keys.total / 20)}
            onChange={setPage}
          />
        )}
      </section>
      <ConfirmDialog
        open={!!remove}
        title="永久撤销 API Key？"
        confirmLabel="撤销密钥"
        intent="danger"
        error={revoke.message}
        onCancel={() => setRemove(null)}
        onConfirm={() =>
          revoke.run(async (signal) => {
            const input = { key_id: remove!.id };
            await revokeUserApiKey(
              baseUrl,
              user.id,
              { ...input, operation_id: revoke.operation(input) },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) setRefresh((value) => value + 1);
          }, "密钥已撤销。")
        }
        onConfirmed={() => setRemove(null)}
      />
    </>
  );
}
