"use client";

import dynamic from "next/dynamic";
import { AdminLoadingState } from "@/themes/argon/admin/components/loading-state";

export const AdminSourceEditor = dynamic(
  () => import("@/themes/argon/admin/components/source-editor"),
  {
    ssr: false,
    loading: () => <AdminLoadingState label="正在载入源码编辑器…" />,
  },
);
