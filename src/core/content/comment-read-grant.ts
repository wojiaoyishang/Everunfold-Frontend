import schema from "@/core/contracts/comment-likes-v0.1-schema";
/** Grants stay in the unlocked component's memory and headers, never URLs or persisted caches. */
export function commentReadHeaders(
  target?: string,
  receipt?: string,
): Record<string, string> {
  if (!target || !receipt) return {};
  const names = schema["x-everunfold-private-read-headers"];
  return { [names.target]: target, [names.receipt]: receipt };
}
