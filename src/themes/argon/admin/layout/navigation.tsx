import {
  adminNavigation,
  type AdminDestination,
} from "@/core/admin/navigation";
import { Icon, type IconName } from "../../components/icon";
import { RouteLink } from "../../components/ui/route-link";
const navigationIcons: Record<AdminDestination["id"], IconName> = {
  overview: "grid",
  content: "copy",
  media: "image",
};
export function AdminNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="admin-navigation" aria-label="后台导航">
      <span className="admin-nav-label">工作空间</span>
      {adminNavigation.map((item) => (
        <RouteLink
          key={item.id}
          href={item.href}
          aria-current={
            pathname.replace(/\/$/, "") === item.href ? "page" : undefined
          }
          title={item.label}
          className="admin-nav-link"
          onClick={onNavigate}
        >
          <Icon name={navigationIcons[item.id]} />
          <span>{item.label}</span>
        </RouteLink>
      ))}
    </nav>
  );
}
