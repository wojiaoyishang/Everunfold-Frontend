import type { Metadata } from "next";
import { AdminMedia } from "@/themes/argon/admin/pages/media";
export const metadata: Metadata = { title: "媒体库" };
export default function MediaPage() {
  return <AdminMedia />;
}
