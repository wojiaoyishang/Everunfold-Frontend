import type { Metadata } from "next";
import type { ReactNode } from "react";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Everunfold", template: "%s · Everunfold" },
  robots: { index: false, follow: false, nocache: true },
};
export default function ManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
