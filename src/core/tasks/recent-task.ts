/** Task identities are hints only; detailed snapshots and logs remain in memory. */
export function clearRecentTaskIds(baseUrl: string, accountId?: string) {
  try {
    const prefix = `everunfold:task:${baseUrl}:${accountId ? `${accountId}:` : ""}`;
    for (let index = sessionStorage.length - 1; index >= 0; --index) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    // Storage may be blocked by the browser; it is never required for authorization.
  }
}
