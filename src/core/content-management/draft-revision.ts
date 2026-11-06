import type { DraftDetail, DraftFields } from "@/core/contracts/content-admin";

/** Access policy and password are private form state, outside the shared document. */
export function hasPrivateDraftChanges(local: DraftFields, saved: DraftDetail) {
  return (
    Boolean(local.access_password) ||
    (local.settings?.visibility ?? "public") !==
      (saved.settings?.visibility ?? "public") ||
    (local.settings?.opens_at ?? null) !== (saved.settings?.opens_at ?? null)
  );
}
