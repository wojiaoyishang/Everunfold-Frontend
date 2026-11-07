"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { MediaPickerDialog as PickerType } from "@/themes/argon/admin/media/media-picker-dialog";
import { ExtensionPlaceholder } from "@/themes/argon/components/extension-placeholder";
const Picker = lazy(() =>
  import("@/themes/argon/admin/media/media-picker-dialog").then((source) => ({
    default: source.MediaPickerDialog,
  })),
);
/** Management-session capability; loading it grants no media permissions. */
export function MediaPickerDialog(props: ComponentProps<typeof PickerType>) {
  return (
    <Suspense fallback={<ExtensionPlaceholder name="media-picker" loading />}>
      <Picker {...props} />
    </Suspense>
  );
}
