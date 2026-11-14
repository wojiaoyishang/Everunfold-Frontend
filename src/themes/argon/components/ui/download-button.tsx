"use client";
import { Button } from "./primitives";
import type { ReactNode } from "react";
import { downloadText } from "@/core/browser/download";
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
      onClick={() => downloadText(filename, content(), mime)}
    >
      {children}
    </Button>
  );
}
