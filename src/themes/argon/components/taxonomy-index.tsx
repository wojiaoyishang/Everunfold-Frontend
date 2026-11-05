import { UiText } from "@/core/i18n/provider";
import { AppLink as Link } from "./navigation-link";
import type { PublicSnapshot, Taxonomy } from "@/core/content/types";
import { taxonomyHref } from "@/core/content/urls";
import { PagePresentation } from "./route-state";
import { Icon } from "./icon";
export function TaxonomyIndex({
  snapshot,
  kind,
}: {
  snapshot: PublicSnapshot;
  kind: Taxonomy["kind"];
}) {
  const terms = snapshot.taxonomies
    .filter((item) => item.kind === kind && item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
  const title = kind === "category" ? "文章分类" : "文章标签";
  return (
    <>
      <PagePresentation site={snapshot.site} />
      <header className="surface page-heading">
        <Icon name={kind === "category" ? "folder" : "tag"} />
        <div>
          <h1>{title}</h1>
          <p>
            <UiText text="共" />
            {terms.length} <UiText text="个" />
            {kind === "category" ? (
              <UiText text="分类" />
            ) : (
              <UiText text="标签" />
            )}
            <UiText text="，找到你感兴趣的内容。" />
          </p>
        </div>
      </header>
      <section
        className={`surface taxonomy-index ${kind === "tag" ? "tag-cloud" : "category-grid"}`}
        aria-label={title}
      >
        {terms.map((term) => (
          <Link href={taxonomyHref(term)} key={term.id}>
            <Icon name={kind === "category" ? "folder" : "tag"} />
            <span>{term.name}</span>
            <small>{term.count}</small>
          </Link>
        ))}
        {!terms.length && (
          <p>
            <UiText text="暂时还没有" />
            {kind === "category" ? (
              <UiText text="分类" />
            ) : (
              <UiText text="标签" />
            )}
            。
          </p>
        )}
      </section>
    </>
  );
}
