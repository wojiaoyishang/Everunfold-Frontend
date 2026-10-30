/** PublicComment.content is already plain text in the versioned public contract. */
export function CommentText({ content }: { content: string }) {
  return <div className="comment-copy">{content}</div>;
}
