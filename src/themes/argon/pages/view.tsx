import { ExtensionComponent } from "@/core/extensions/components";
import { ThemeTemplate, ThemeSlot } from "@/core/themes/presentation";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { hasPageImplementation } from "@/core/pages/registry";
import type { PageArticleData } from "@/core/pages/articles";
import {
  RegisteredPageView,
  useRegisteredPageImplementation,
} from "@/core/pages/registered-view";
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
  articleData,
}: {
  page: PublicManagedPage;
  onReady?: () => void;
  translations?: Content["translations"];
  comments?: PublicComment[];
  articleData?: PageArticleData;
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
          articleData={articleData}
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
            articleData={articleData}
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
  articleData,
}: Parameters<typeof ManagedPageView>[0]) {
  const { entry: implementation } = useRegisteredPageImplementation(page);
  return (
    <article
      className={styles.page}
      data-reading-content="true"
      data-page-layout={implementation?.layout}
    >
      <ThemeSlot
        name="page.header.before"
        context={{ page, preview: Boolean(onReady) }}
      />
      {implementation?.heading !== "component" && (
        <ExtensionComponent
          name="public.page.heading"
          page={page}
          translations={translations}
        />
      )}
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
            <RegisteredPageView
              page={page}
              articleData={articleData}
              preview={Boolean(onReady)}
              onReady={onReady}
            />
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
