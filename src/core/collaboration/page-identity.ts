/** A copied tab gets its own outbox; refreshing the same page retains its recovery key. */
export function pageIdentity(
  stored: string | null,
  timeOrigin: number,
  navigation: string | undefined,
  fresh: string,
) {
  let previous: { id?: string; timeOrigin?: number } = {};
  try {
    const value: unknown = stored ? JSON.parse(stored) : null;
    if (value && typeof value === "object") previous = value;
  } catch {
    if (navigation === "reload" && stored) previous.id = stored;
  }
  const sameDocument = previous.timeOrigin === timeOrigin;
  const id =
    typeof previous.id === "string" && (sameDocument || navigation === "reload")
      ? previous.id
      : fresh;
  return { id, timeOrigin };
}
