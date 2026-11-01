export interface AdminPreferences {
  mode: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  motion: "full" | "system" | "reduced";
  sidebarCollapsed: boolean;
}
export const defaultAdminPreferences: AdminPreferences = {
  mode: "system",
  density: "comfortable",
  motion: "full",
  sidebarCollapsed: false,
};
/** Only appearance is persisted. Session, permissions and content never enter this store. */
export function adminPreferences(input: unknown): AdminPreferences {
  const raw =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  return {
    mode: raw.mode === "dark" || raw.mode === "light" ? raw.mode : "system",
    density: raw.density === "compact" ? "compact" : "comfortable",
    motion:
      raw.motion === "system" || raw.motion === "reduced" ? raw.motion : "full",
    sidebarCollapsed: raw.sidebarCollapsed === true,
  };
}
export function parseAdminPreferences(value: string | null): AdminPreferences {
  try {
    return adminPreferences(JSON.parse(value ?? "null"));
  } catch {
    return { ...defaultAdminPreferences };
  }
}
export function adminPreferencesKey(baseUrl: string, userId: string): string {
  return `everunfold.admin.appearance.v1:${encodeURIComponent(baseUrl.replace(/\/+$/, ""))}:${encodeURIComponent(userId)}`;
}
