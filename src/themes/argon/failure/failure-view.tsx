"use client";
import { useEffect, useRef } from "react";
import type { FailureStatus } from "@/core/navigation/failure-page";
import { FailureSurface } from "./failure-surface";
import { enhanceFailure } from "./enhance-failure";
import { createPairGame } from "./pair-game";
import { failureStyles } from "./styles";

export function FailureView({
  status,
  reset,
  embedded = true,
}: {
  status: FailureStatus;
  reset?: () => void;
  embedded?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (root.current)
      return enhanceFailure(root.current, createPairGame, reset);
  }, [reset]);
  return (
    <div ref={root}>
      <meta name="robots" content="noindex,nofollow" />
      <style>{failureStyles}</style>
      <FailureSurface status={status} embedded={embedded} />
    </div>
  );
}
