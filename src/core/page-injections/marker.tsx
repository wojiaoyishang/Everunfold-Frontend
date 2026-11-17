import type { InjectionPageType } from "./matching";

export function PageInjectionMarker({ type }: { type: InjectionPageType }) {
  return <span hidden data-page-injection-kind={type} />;
}
