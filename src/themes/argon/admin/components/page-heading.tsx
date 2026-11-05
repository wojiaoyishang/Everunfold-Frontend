import type { ReactNode } from "react";
export function AdminPageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="admin-page-heading">
      <div>
        <h1>
          <UiText text={title} />
        </h1>
        {description && (
          <p>
            <UiText text={description} />
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
import { UiText } from "@/core/i18n/provider";
