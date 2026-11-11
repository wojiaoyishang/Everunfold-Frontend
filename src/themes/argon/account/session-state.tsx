import { UiText } from "@/core/i18n/provider";
import { Button } from "../components/ui/primitives";
import { RouteLink } from "../components/ui/route-link";
import { Icon } from "../components/icon";

export function AccountSessionState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="account-session-state">
      <section
        className="account-session-card"
        aria-labelledby="account-state-title"
      >
        <span
          className="account-session-mark"
          data-error={error ? "true" : undefined}
        >
          <Icon name={error ? "cloud-off" : "user"} />
        </span>
        <span className="admin-eyebrow">EVERUNFOLD ACCOUNT</span>
        <h1 id="account-state-title">
          <UiText text={error ? "账号服务暂时不可用" : "正在准备账号中心"} />
        </h1>
        <div
          className="account-session-status"
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
        >
          <span
            className="account-session-indicator"
            data-loading={!error || undefined}
          >
            <Icon name={error ? "warning" : "refresh"} />
          </span>
          <p>
            <UiText
              text={
                error || "正在确认登录状态和账号资料，连接恢复后会自动继续。"
              }
            />
          </p>
        </div>
        <div className="account-session-actions">
          {error ? (
            <>
              <Button
                className="admin-button admin-button-primary"
                onClick={onRetry}
              >
                <Icon name="refresh" />
                <UiText text="重新检查" />
              </Button>
              <RouteLink href="/login?next=%2Faccount" className="admin-button">
                <UiText text="前往登录" />
              </RouteLink>
            </>
          ) : (
            <span className="account-session-loading-line" aria-hidden="true">
              <span />
            </span>
          )}
          <RouteLink href="/" className="admin-button">
            <Icon name="arrow-left" />
            <UiText text="返回站点" />
          </RouteLink>
        </div>
      </section>
    </div>
  );
}
