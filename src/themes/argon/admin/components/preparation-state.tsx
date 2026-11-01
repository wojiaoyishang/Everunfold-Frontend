import type { ReactNode } from "react";
import { Icon, type IconName } from "../../components/icon";
export function PreparationState({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-preparation" role="status">
      <span className="admin-empty-icon">
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      <span className="admin-badge">准备中</span>
    </div>
  );
}
