import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/themes/argon/management/management.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "管理后台 · Everunfold", template: "%s · Everunfold" },
  robots: { index: false, follow: false, nocache: true },
};

export default function ManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="management-root">{children}</div>;
}
