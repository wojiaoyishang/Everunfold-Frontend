import { Fragment, type ReactNode } from "react";
import { CommentText } from "../comment-text";

function inline(text: string): ReactNode[] {
  // Only trusted React elements are created. HTML and unsupported Markdown remain text.
  return text
    .split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g)
    .map((part, index) =>
      index % 2 === 1 && part.startsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : index % 2 === 1 && part.startsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ),
    );
}

export function CommentBody({
  body,
  formatted,
}: {
  body: string;
  formatted: boolean;
}) {
  if (!formatted) return <CommentText content={body} />;
  return (
    <div className="comment-copy comment-formatted">
      {body
        .split(/\r?\n/)
        .map((line, index) =>
          line.startsWith("> ") ? (
            <blockquote key={index}>{inline(line.slice(2))}</blockquote>
          ) : (
            <p key={index}>{line ? inline(line) : <br />}</p>
          ),
        )}
    </div>
  );
}
