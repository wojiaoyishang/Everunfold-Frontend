"use client";
import { FailureView } from "@/themes/argon/failure/failure-view";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <FailureView status={500} reset={reset} />;
}
