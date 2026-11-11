import { UiText } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";

export function AdminRouteState({
  error = false,
  onRetry,
}: {
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <section
      className="admin-route-state"
      data-error={error || undefined}
      aria-live={error ? "assertive" : "polite"}
    >
      <span className="admin-route-state-mark">
        <Icon name={error ? "cloud-off" : "activity"} />
      </span>
      <span className="admin-eyebrow">EVERUNFOLD WORKSPACE</span>
      <h1>
        <UiText text={error ? "无法完成此页面请求" : "正在加载工作区内容"} />
      </h1>
      <p>
        <UiText
          text={
            error
              ? "服务暂时没有返回可用结果。已有数据不会被覆盖，可以重新检查连接。"
              : "正在准备页面数据和显示状态，完成后会自动继续。"
          }
        />
      </p>
      {!error && (
        <span className="admin-route-state-progress" aria-hidden="true">
          <span />
        </span>
      )}
      <div className="admin-route-state-actions">
        {error && onRetry && (
          <Button
            className="admin-button admin-button-primary"
            onClick={onRetry}
          >
            <Icon name="refresh" />
            <UiText text="重新检查" />
          </Button>
        )}
        <RouteLink href="/admin" className="admin-button">
          <Icon name="grid" />
          <UiText text="返回工作台" />
        </RouteLink>
      </div>
    </section>
  );
}
