import { UiText } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";

export function AdminWarning({ text }: { text: string }) {
  return (
    <div className="admin-warning" role="note">
      <Icon name="warning" />
      <p>
        <UiText text={text} />
      </p>
    </div>
  );
}
