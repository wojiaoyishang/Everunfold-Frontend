import type { Taxonomy } from "@/core/content/types";
import { taxonomyHref } from "@/core/content/urls";
import { Icon } from "./icon";
import { AppLink } from "./navigation-link";

export function ArticleTags({ tags }: { tags: Taxonomy[] }) {
  if (!tags.length) return null;
  return (
    <footer className="article-footer">
      <div className="article-tags">
        {tags.map((tag) => {
          const label = (
            <>
              <Icon name="tag" />
              {tag.name}
            </>
          );
          return tag.count > 0 ? (
            <AppLink key={tag.id} href={taxonomyHref(tag)}>
              {label}
            </AppLink>
          ) : (
            <span key={tag.id}>{label}</span>
          );
        })}
      </div>
    </footer>
  );
}
