/** Strip source blocks before any value reaches a client boundary. */
export function contentMetadata<T extends { content: unknown }>(
  content: T,
): Omit<T, "content"> {
  return Object.fromEntries(
    Object.entries(content).filter(([key]) => key !== "content"),
  ) as Omit<T, "content">;
}
