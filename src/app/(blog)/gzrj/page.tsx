import { readPageSnapshot } from "@/core/i18n/server";
import { CodePage, codePageMetadata } from "../code-page";

export async function generateMetadata() {
  return codePageMetadata(await readPageSnapshot(), "/gzrj");
}

export default async function Page() {
  return <CodePage snapshot={await readPageSnapshot()} path="/gzrj" />;
}
