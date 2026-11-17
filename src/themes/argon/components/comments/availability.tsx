"use client";

import type { ReactNode } from "react";
import { useOptionalRouteState } from "../route-state";

export function useSiteCommentsDisabled() {
  return useOptionalRouteState()?.site.settings?.comments_disabled === true;
}

export function CommentAvailability({ children }: { children: ReactNode }) {
  return useSiteCommentsDisabled() ? null : children;
}
