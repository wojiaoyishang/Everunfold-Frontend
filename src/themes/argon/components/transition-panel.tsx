import type { ReactNode } from "react";

/** Retain both panels so intrinsic height and opacity can animate in either direction. */
export function TransitionPanel({
  active,
  id,
  labelledBy,
  children,
  role = "tabpanel",
}: {
  active: boolean;
  id: string;
  labelledBy: string;
  children: ReactNode;
  role?: "tabpanel" | "region";
}) {
  return (
    <div
      id={id}
      role={role}
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
