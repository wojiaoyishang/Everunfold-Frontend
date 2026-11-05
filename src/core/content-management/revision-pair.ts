export function revisionReference(value: string | null): string {
  return value &&
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(Number(value))
    ? value
    : "head";
}

/** Native history changes synchronously; swap the current address rather than older rendered props. */
export function swapRevisionPair(current: URLSearchParams) {
  const next = new URLSearchParams(current);
  const before =
    current.get("view") === "version"
      ? revisionReference(current.get("selected"))
      : "head";
  next.set("view", "version");
  next.set("selected", revisionReference(current.get("compare")));
  next.set("compare", before);
  return next;
}
