export type RegionKind = "reply-only" | "password-area";
export const regionNames = ["reply-only", "password-area"] as const;

export function regionKind(name: string): name is RegionKind {
  return name === "reply-only" || name === "password-area";
}
