import { UiText } from "@/core/i18n/provider";
import { Icon } from "../components/icon";
import { Button } from "../components/ui/primitives";

export function EntrySubmit({
  label,
  busyLabel,
  busy,
  disabled,
}: {
  label: string;
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      className="management-primary login-submit"
      data-pending={busy || undefined}
      aria-busy={busy}
      disabled={busy || disabled}
    >
      {busy ? (
        <span key="pending" className="login-submit-label" role="status">
          <Icon name="refresh" className="management-spinning" />
          <UiText text={busyLabel} />
        </span>
      ) : (
        <>
          <span key="ready" className="login-submit-label">
            <UiText text={label} />
          </span>
          <Icon name="arrow" />
        </>
      )}
    </Button>
  );
}
