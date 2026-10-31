"use client";
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { installHorizontalWheel } from "@/core/browser/horizontal-wheel";

export function HorizontalRail(props: ComponentPropsWithoutRef<"ul">) {
  const rail = useRef<HTMLUListElement>(null);
  useEffect(
    () => (rail.current ? installHorizontalWheel(rail.current) : undefined),
    [],
  );
  return <ul {...props} ref={rail} />;
}
