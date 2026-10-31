import { Icon } from "../components/icon";
import { Button, TextLink } from "../components/ui/primitives";
import { authFailureMessage } from "@/core/auth/session";

export function SessionFeedback({
  error,
  failureMessage,
  onRetry,
  checkingText = "正在确认登录状态",
}: {
  error?: unknown;
  failureMessage?: string;
  onRetry: () => void;
  checkingText?: string;
}) {
  const failed = error !== undefined;
  return (
    <div className="management-session" role={failed ? "alert" : "status"}>
      <span className="management-session-icon" data-loading={!failed}>
        <Icon name={failed ? "cloud-off" : "refresh"} />
      </span>
      <h2>{failed ? "暂时无法进入" : checkingText}</h2>
      <p>
        {failed
          ? failureMessage || authFailureMessage(error, "session")
          : "请稍候"}
      </p>
      {failed && (
        <div className="management-session-actions">
          <Button className="management-primary" onClick={onRetry}>
            <Icon name="refresh" />
            重新检查
          </Button>
          <TextLink href="/login" className="management-text-link">
            返回登录
          </TextLink>
        </div>
      )}
    </div>
  );
}
