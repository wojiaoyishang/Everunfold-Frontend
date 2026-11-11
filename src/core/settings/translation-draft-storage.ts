const VERSION = 1;

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type StoredDrafts = {
  version: typeof VERSION;
  saved_at: string;
  drafts: Record<string, string>;
};

export function translationDraftKey(baseUrl: string, userId: string) {
  return `everunfold.admin.translation-drafts.v${VERSION}:${encodeURIComponent(
    baseUrl.replace(/\/+$/, ""),
  )}:${encodeURIComponent(userId)}`;
}

export function readTranslationDrafts(storage: DraftStorage, key: string) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      Array.isArray(value) ||
      !("version" in value) ||
      value.version !== VERSION ||
      !("drafts" in value) ||
      typeof value.drafts !== "object" ||
      value.drafts === null ||
      Array.isArray(value.drafts)
    )
      return null;
    const drafts = Object.fromEntries(
      Object.entries(value.drafts).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    return Object.keys(drafts).length ? drafts : null;
  } catch {
    return null;
  }
}

export function writeTranslationDrafts(
  storage: DraftStorage,
  key: string,
  drafts: Record<string, string>,
) {
  if (!Object.keys(drafts).length) {
    storage.removeItem(key);
    return;
  }
  const value: StoredDrafts = {
    version: VERSION,
    saved_at: new Date().toISOString(),
    drafts,
  };
  storage.setItem(key, JSON.stringify(value));
}
