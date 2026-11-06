"use client";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  saveShortcode,
  applyShortcode,
  archiveShortcode,
  restoreShortcode,
} from "@/core/contracts/settings";
import type { ShortcodeItem, ShortcodeSource } from "@/core/contracts/settings";

type Identity = Pick<ShortcodeItem, "id" | "revision">;
const action = (item: Identity) => ({
  id: item.id,
  expected_revision: item.revision,
});

/** Browser use cases own transport/session details; the theme owns their presentation. */
export function useShortcodeActions() {
  const { baseUrl, csrfToken } = useAdminRequest();
  return {
    save: async (value: ShortcodeSource, item: Identity | null) =>
      (
        await saveShortcode(
          baseUrl,
          { id: item?.id, expected_revision: item?.revision ?? 0, value },
          csrfToken,
        )
      ).data,
    apply: async (item: Identity) =>
      (await applyShortcode(baseUrl, action(item), csrfToken)).data,
    archive: async (item: Identity) =>
      (await archiveShortcode(baseUrl, action(item), csrfToken)).data,
    restore: async (item: Identity, version: number) =>
      (await restoreShortcode(baseUrl, { ...action(item), version }, csrfToken))
        .data,
  };
}
