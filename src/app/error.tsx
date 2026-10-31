"use client";
import { Button } from "@/themes/argon/components/ui/primitives";
import { failurePage } from "@/core/navigation/failure-page";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const page = failurePage(503);
  return (
    <section className="standalone-state">
      <p className="state-code">{page.code}</p>
      <h1>{page.title}</h1>
      <p>{page.description}</p>
      <Button className="primary-button" onClick={reset}>
        重试
      </Button>
    </section>
  );
}
