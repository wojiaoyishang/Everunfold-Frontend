import { UiText } from "@/core/i18n/provider";
import { Button, TextField } from "@/themes/argon/components/ui/primitives";
import { Icon } from "../icon";
import { TransitionPanel } from "../transition-panel";
import type { CommentDraft, DraftErrors } from "./model";
export function CommentIdentity({
  prefix,
  draft,
  errors,
  extra,
  signedInName,
  setExtra,
  update,
}: {
  prefix: string;
  draft: Pick<CommentDraft, "author" | "website">;
  errors: DraftErrors;
  extra: boolean;
  signedInName?: string | null;
  setExtra: (value: boolean) => void;
  update: (value: Partial<Pick<CommentDraft, "author" | "website">>) => void;
}) {
  return (
    <>
      <div className="composer-identity">
        {signedInName ? (
          <div className="composer-signed-identity">
            <Icon name="user" />
            <strong>{signedInName}</strong>
          </div>
        ) : (
          <label htmlFor={`${prefix}-author`}>
            <UiText text="昵称" />
            <span aria-hidden="true">*</span>
            <TextField
              id={`${prefix}-author`}
              name="author"
              required
              maxLength={40}
              autoComplete="nickname"
              placeholder="怎么称呼你？"
              value={draft.author}
              onChange={(event) => update({ author: event.target.value })}
              aria-invalid={!!errors.author}
              aria-describedby={
                errors.author ? `${prefix}-author-error` : undefined
              }
            />
            {errors.author && (
              <span
                id={`${prefix}-author-error`}
                className="form-error"
                role="alert"
              >
                {errors.author}
              </span>
            )}
          </label>
        )}
        <Button
          id={`${prefix}-extra-toggle`}
          className="composer-extra-toggle"
          type="button"
          aria-expanded={extra}
          aria-controls={`${prefix}-extra-panel`}
          onClick={() => setExtra(!extra)}
        >
          <UiText text="个人网站（选填）" />
          <Icon name="chevron" />
        </Button>
      </div>
      <TransitionPanel
        id={`${prefix}-extra-panel`}
        labelledBy={`${prefix}-extra-toggle`}
        active={extra}
        role="region"
      >
        <div className="composer-extra-fields">
          <label htmlFor={`${prefix}-website`}>
            <UiText text="个人网站" />
            <TextField
              id={`${prefix}-website`}
              name="website"
              type="url"
              autoComplete="url"
              maxLength={300}
              placeholder="https://"
              value={draft.website}
              onChange={(event) => update({ website: event.target.value })}
              aria-invalid={!!errors.website}
              aria-describedby={
                errors.website ? `${prefix}-website-error` : undefined
              }
            />
            {errors.website && (
              <span
                id={`${prefix}-website-error`}
                className="form-error"
                role="alert"
              >
                {errors.website}
              </span>
            )}
          </label>
        </div>
      </TransitionPanel>
    </>
  );
}
