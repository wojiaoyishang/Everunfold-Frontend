import { GlossaryDirectory } from "@/themes/argon/glossary/directory";
import { readPageSnapshot } from "@/core/i18n/server";
import { codePageMetadata } from "../code-page";

export async function generateMetadata() {
  return codePageMetadata(await readPageSnapshot(), "/glossary");
}

export default function GlossaryPage() {
  return <GlossaryDirectory />;
}
