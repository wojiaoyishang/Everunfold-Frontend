import type { PublicManagedPage } from "@/generated/pages-contract";
import { hasPageImplementation } from "@/core/pages/registry";
import { PeoplePage } from "./people";
import { PageFrame } from "./frame";
import styles from "./pages.module.css";
import { ContentLanguages } from "../components/content-languages";
import type { Content } from "@/core/content/types";

export function ManagedPageView({
  page,
  onReady,
  translations,
}: {
  page: PublicManagedPage;
  onReady?: () => void;
  translations?: Content["translations"];
}) {
  if (!hasPageImplementation(page))
    throw new Error("Unavailable registered page implementation");
  return (
    <article className={styles.page} data-reading-content="true">
      <header className={styles.heading}>
        <h1>{page.title}</h1>
        {page.description && <p>{page.description}</p>}
        {page.source === "custom" && page.language && (
          <ContentLanguages
            content={{ id: page.id, language: page.language, translations }}
          />
        )}
      </header>
      {page.source === "custom" ? (
        <PageFrame value={page} onReady={onReady} />
      ) : (
        <PeoplePage options={page.options} />
      )}
    </article>
  );
}
