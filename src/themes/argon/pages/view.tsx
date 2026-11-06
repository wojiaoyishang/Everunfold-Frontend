import type { PublicManagedPage } from "@/generated/pages-contract";
import { hasPageImplementation } from "@/core/pages/registry";
import { PeoplePage } from "./people";
import { PageFrame } from "./frame";
import styles from "./pages.module.css";

export function ManagedPageView({ page }: { page: PublicManagedPage }) {
  if (!hasPageImplementation(page))
    throw new Error("Unavailable registered page implementation");
  return (
    <article className={styles.page} data-reading-content="true">
      <header className={styles.heading}>
        <h1>{page.title}</h1>
        {page.description && <p>{page.description}</p>}
      </header>
      {page.source === "custom" ? (
        <PageFrame value={page} />
      ) : (
        <PeoplePage options={page.options} />
      )}
    </article>
  );
}
