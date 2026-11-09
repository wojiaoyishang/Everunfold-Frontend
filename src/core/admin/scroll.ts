/** Administrative motion preferences are independent of public reader preferences. */
export function adminScrollBehavior(element: Element | null): ScrollBehavior {
  const preference =
    element?.closest<HTMLElement>(".admin-root")?.dataset.adminMotion;
  const reduced =
    preference === "reduced" ||
    (preference !== "full" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches);
  return reduced ? "instant" : "smooth";
}
