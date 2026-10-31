import { Button, TextField } from "@/themes/argon/components/ui/primitives";
import { Icon } from "../icon";
import { TransitionPanel } from "../transition-panel";
import type { CommentDraft, DraftErrors } from "./model";
export function CommentIdentity({
  prefix,
  draft,
  errors,
  extra,
  setExtra,
  update,
}: {
  prefix: string;
  draft: Pick<CommentDraft, "author" | "email" | "website">;
  errors: DraftErrors;
  extra: boolean;
  setExtra: (value: boolean) => void;
  update: (
    value: Partial<Pick<CommentDraft, "author" | "email" | "website">>,
  ) => void;
}) {
  return (
    <>
      {" "}
      <div className="composer-identity">
        <label htmlFor={`${prefix}-author`}>
          昵称 <span aria-hidden="true">*</span>
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
        <Button
          id={`${prefix}-extra-toggle`}
          className="composer-extra-toggle"
          type="button"
          aria-expanded={extra}
          aria-controls={`${prefix}-extra-panel`}
          onClick={() => setExtra(!extra)}
        >
          邮箱与网站（选填）
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
          <label htmlFor={`${prefix}-email`}>
            邮箱（不会公开）
            <TextField
              id={`${prefix}-email`}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              value={draft.email}
              onChange={(event) => update({ email: event.target.value })}
              aria-invalid={!!errors.email}
              aria-describedby={
                errors.email ? `${prefix}-email-error` : undefined
              }
            />
            {errors.email && (
              <span
                id={`${prefix}-email-error`}
                className="form-error"
                role="alert"
              >
                {errors.email}
              </span>
            )}
          </label>
          <label htmlFor={`${prefix}-website`}>
            个人网站
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
