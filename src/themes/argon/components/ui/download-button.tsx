"use client";
import { Button } from "./primitives";
import type { ReactNode } from "react";
export function DownloadButton({
  filename,
  content,
  children,
  className,
  mime = "application/json;charset=utf-8",
}: {
  filename: string;
  content: () => string;
  children: ReactNode;
  className?: string;
  mime?: string;
}) {
  return (
    <Button
      className={className}
      onClick={() => {
        const url = URL.createObjectURL(new Blob([content()], { type: mime }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      {children}
    </Button>
  );
}
