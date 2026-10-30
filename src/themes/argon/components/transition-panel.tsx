import type { ReactNode } from "react";

/** Retain both panels so intrinsic height and opacity can animate in either direction. */
export function TransitionPanel({
  active,
  id,
  labelledBy,
  children,
}: {
  active: boolean;
  id: string;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="tabpanel"
      aria-labelledby={labelledBy}
      aria-hidden={!active}
      inert={!active}
      className="transition-panel"
      data-active={active}
    >
      <div className="transition-panel-inner">{children}</div>
    </div>
  );
}
