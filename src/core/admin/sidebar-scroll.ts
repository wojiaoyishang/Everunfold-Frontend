const sidebarScrollPrefix = "everunfold.admin.sidebar-scroll.v1";

function canonicalAdminPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export function adminSidebarScrollKey(userId: string, pathname: string) {
  return `${sidebarScrollPrefix}:${encodeURIComponent(userId)}:${encodeURIComponent(canonicalAdminPath(pathname))}`;
}

export function parseAdminSidebarScroll(value: string | null) {
  if (!value) return null;
  const scrollTop = Number(value);
  return Number.isFinite(scrollTop) && scrollTop >= 0
    ? Math.floor(scrollTop)
    : null;
}
