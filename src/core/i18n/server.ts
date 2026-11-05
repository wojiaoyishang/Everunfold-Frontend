import "server-only";
import { headers } from "next/headers";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { localeOf } from "./locale";
import { localizedSnapshot } from "./snapshot";

export async function readPageSnapshot() {
  const [snapshot, request] = await Promise.all([
    readPublicSnapshot(),
    headers(),
  ]);
  return localizedSnapshot(
    snapshot,
    localeOf(request.get("x-everunfold-locale")),
  );
}
