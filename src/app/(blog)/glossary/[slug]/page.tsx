import { readPageSnapshot } from "@/core/i18n/server";
import { GlossaryTerm, glossaryTermMetadata } from "../term";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const [snapshot, { slug }] = await Promise.all([readPageSnapshot(), params]);
  return glossaryTermMetadata(snapshot, slug);
}

export default async function GlossaryTermPage({ params }: Props) {
  const [snapshot, { slug }] = await Promise.all([readPageSnapshot(), params]);
  return (
    <>
      <PageInjectionMarker type="glossary" />
      <GlossaryTerm snapshot={snapshot} slug={slug} />
    </>
  );
}
import { PageInjectionMarker } from "@/core/page-injections/marker";
