"use client";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { embeddedEditorSurface } from "@/core/preview/bridge";

/** Keep the existing save callbacks in their authenticated editor. */
export function EmbeddedEditorActions({
  children,
  primary,
}: {
  children?: ReactNode;
  primary?: ReactNode;
}) {
  const surface = embeddedEditorSurface();
  const actions = surface?.querySelector("[data-live-editor-actions]");
  const main = surface?.querySelector("[data-live-editor-primary]");
  if (actions && main)
    return (
      <>
        {createPortal(
          children && (
            <div
              onClick={(event) => {
                event.currentTarget
                  .closest<HTMLElement>("[popover]")
                  ?.hidePopover();
              }}
            >
              {children}
            </div>
          ),
          actions,
        )}
        {createPortal(primary, main)}
      </>
    );
  return (
    <>
      {children}
      {primary}
    </>
  );
}
