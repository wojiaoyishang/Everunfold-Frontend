"use client";

import { AdminRouteState } from "@/themes/argon/admin/components/route-state";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <AdminRouteState error onRetry={reset} />;
}
