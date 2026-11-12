import { CommentsPage } from "@/themes/argon/admin/comments/page";
import { CommentReviewPage } from "@/themes/argon/admin/comments/review";

export default async function Page({
  searchParams,
}: PageProps<"/admin/comments">) {
  const { comment, action } = await searchParams;
  if (comment === undefined) return <CommentsPage />;
  const id =
    typeof comment === "string" &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(comment)
      ? comment.toLowerCase()
      : null;
  return (
    <CommentReviewPage
      key={JSON.stringify([id, action])}
      id={id}
      intent={action === "approve" || action === "reject" ? action : undefined}
    />
  );
}
