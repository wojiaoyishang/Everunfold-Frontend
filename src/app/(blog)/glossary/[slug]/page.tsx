import { GlossaryDetailPage } from "@/themes/argon/glossary/detail";

export const metadata = { title: "术语表" };

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <GlossaryDetailPage slug={decodeURIComponent((await params).slug)} />;
}
