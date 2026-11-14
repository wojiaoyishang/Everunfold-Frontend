import { UiText } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Button, TextLink } from "../../components/ui/primitives";
import { AdminStatusBrand } from "./status-brand";
export function AdminAccessState({
  status,
  error,
  onRetry,
}: {
  status: string;
  error: string;
  onRetry: () => void;
}) {
  return (
    <main
      className="admin-root admin-access"
      data-surface="admin"
      data-admin-mode="system"
    >
      <section className="admin-access-card" aria-labelledby="access-title">
        <AdminStatusBrand />
        <h1 id="access-title">
          <UiText text="工作空间" />
        </h1>
        <div className="admin-access-status" role={error ? "alert" : "status"}>
          <Icon
            name={error ? "cloud-off" : "refresh"}
            className={error ? "" : "admin-spinning"}
          />
          <p>{error || <UiText text={status} />}</p>
        </div>
        <div className="admin-access-actions">
          {error && (
            <Button
              className="admin-button admin-button-primary"
              onClick={onRetry}
            >
              <UiText text="重新检查" />
            </Button>
          )}
          <TextLink href="/" className="admin-button">
            <UiText text="返回站点" />
          </TextLink>
          {error && (
            <TextLink href="/login" className="admin-button">
              <UiText text="前往登录" />
            </TextLink>
          )}
        </div>
        <noscript>
          <p>
            <UiText text="请启用 JavaScript 后访问后台。" />
          </p>
        </noscript>
      </section>
    </main>
  );
}
