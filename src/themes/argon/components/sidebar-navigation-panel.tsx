import "./sidebar-navigation-panel.css";
import { useT } from "@/core/i18n/provider";
import { Button } from "./ui/primitives";
import { Icon } from "./icon";

export function SidebarBanner({
  title,
  alias,
  tagline,
}: {
  title: string;
  alias: string;
  tagline: string;
}) {
  if (!title && !alias && !tagline) return null;
  return (
    <div className="sidebar-banner">
      {(title || alias) && (
        <p className="sidebar-banner-title">
          {title}
          {alias && <span className="sidebar-title-alias">{alias}</span>}
        </p>
      )}
      {tagline && <p className="sidebar-banner-tagline">{tagline}</p>}
    </div>
  );
}

export function SidebarSearchButton({
  label,
  onClick,
}: {
  label: string;
  onClick: (trigger: HTMLButtonElement) => void;
}) {
  const t = useT();
  return (
    <Button
      type="button"
      className="sidebar-search"
      aria-haspopup="dialog"
      onClick={(event) => onClick(event.currentTarget)}
    >
      <Icon name="search" />
      <span>{label || t("搜索")}</span>
    </Button>
  );
}
