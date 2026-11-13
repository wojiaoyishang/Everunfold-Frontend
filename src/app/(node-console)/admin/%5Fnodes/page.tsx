import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { readConfiguration } from "@/core/config/server";
import { NodeConsole } from "@/themes/argon/admin/nodes/console";
import "@/themes/argon/admin/admin.css";

export const metadata: Metadata = {
  title: "节点诊断 · Everunfold",
  robots: { index: false, follow: false },
};

export default async function NodesPage() {
  const { nodesMonitor } = readConfiguration();
  if (
    !nodesMonitor.enabled ||
    !nodesMonitor.origin ||
    (await headers()).get("host")?.toLowerCase() !==
      new URL(nodesMonitor.origin).host
  )
    notFound();
  return <NodeConsole />;
}
