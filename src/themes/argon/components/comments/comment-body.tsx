import { CommentText } from "../comment-text";
import { commentMarkdown } from "@/core/rendering/comment-markdown";
import { ArticleMedia } from "../article-media";
import { CodeBlock } from "../reader/code-tools";

export function CommentBody({
  body,
  formatted,
}: {
  body: string;
  formatted: boolean;
}) {
  if (!formatted) return <CommentText content={body} />;
  return (
    <ArticleMedia>
      <div className="comment-copy comment-formatted">
        {commentMarkdown(body, (code, language) => (
          <CodeBlock code={code} language={language} />
        ))}
      </div>
    </ArticleMedia>
  );
}
