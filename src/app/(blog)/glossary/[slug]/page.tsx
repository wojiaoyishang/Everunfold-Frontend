import { GlossaryDetailPage } from "@/themes/argon/glossary/detail";
import { translate } from "@/core/i18n/messages";
import { messageLocale } from "@/core/i18n/locale";
import { headers } from "next/headers";

export async function generateMetadata() {
  const request = await headers();
  return {
    title: translate(
      "术语表",
      messageLocale(request.get("x-everunfold-ui-locale")),
    ),
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <GlossaryDetailPage slug={decodeURIComponent((await params).slug)} />;
}
