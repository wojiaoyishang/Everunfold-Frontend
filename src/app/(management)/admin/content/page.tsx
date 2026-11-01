import type { Metadata } from "next";
import { AdminContent } from "@/themes/argon/admin/pages/content";
export const metadata: Metadata = { title: "内容" };
export default function ContentPage() {
  return <AdminContent />;
}
