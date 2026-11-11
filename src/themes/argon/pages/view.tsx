import { ExtensionComponent } from "@/core/extensions/components";
import { ThemeTemplate, ThemeSlot } from "@/core/themes/presentation";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { hasPageImplementation } from "@/core/pages/registry";
import { RegisteredPageView } from "@/core/pages/registered-view";
import { PageFrame } from "./frame";
import styles from "./pages.module.css";
import { ContentLanguages } from "../components/content-languages";
import type { Content, PublicComment } from "@/core/content/types";
import { ProtectedManagedPage } from "./protected-page";
import { PageCommentsBoundary } from "@/core/pages/comments";
import { PageImageViewerBoundary } from "./image-viewer-boundary";

export function ManagedPageView({
  page,
  onReady,
  translations,
  comments = [],
}: {
  page: PublicManagedPage;
  onReady?: () => void;
  translations?: Content["translations"];
  comments?: PublicComment[];
}) {
  if (!hasPageImplementation(page))
    throw new Error("Unavailable registered page implementation");
  return (
    <ThemeTemplate
      name="page"
      context={{ page, path: page.path, preview: Boolean(onReady) }}
      onReady={onReady}
    >
      {page.access === "captcha" && !onReady ? (
        <ProtectedManagedPage
          key={`${page.id}:${page.revision}`}
          page={page}
          translations={translations}
        />
      ) : (
        <PageCommentsBoundary
          key={page.id}
          page={page}
          comments={comments}
          preview={Boolean(onReady)}
        >
          <ExtensionComponent
            name="public.page.surface"
            notifyReady={false}
            page={page}
            onReady={onReady}
            translations={translations}
          />
        </PageCommentsBoundary>
      )}
    </ThemeTemplate>
  );
}

export function ManagedPageSurface({
  page,
  onReady,
  translations,
}: Parameters<typeof ManagedPageView>[0]) {
  return (
    <article className={styles.page} data-reading-content="true">
      <ThemeSlot
        name="page.header.before"
        context={{ page, preview: Boolean(onReady) }}
      />
      <ExtensionComponent
        name="public.page.heading"
        page={page}
        translations={translations}
      />
      <ThemeSlot
        name="page.header.after"
        context={{ page, preview: Boolean(onReady) }}
      />
      <ThemeSlot
        name="page.body.before"
        context={{ page, preview: Boolean(onReady) }}
      />
      <PageImageViewerBoundary page={page}>
        <div data-managed-page-body="true">
          {page.source === "custom" ? (
            <PageFrame value={page} onReady={onReady} />
          ) : (
            <RegisteredPageView page={page} onReady={onReady} />
          )}
        </div>
      </PageImageViewerBoundary>
      <ThemeSlot
        name="page.body.after"
        context={{ page, preview: Boolean(onReady) }}
      />
    </article>
  );
}

export function ManagedPageHeading({
  page,
  translations,
}: Parameters<typeof ManagedPageView>[0]) {
  return (
    <header className={styles.heading}>
      <h1>{page.title}</h1>
      {page.description && <p>{page.description}</p>}
      {page.source === "custom" && page.language && (
        <ContentLanguages
          content={{ id: page.id, language: page.language, translations }}
        />
      )}
    </header>
  );
}
