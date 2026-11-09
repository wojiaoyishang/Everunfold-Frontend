"use client";
import { usePageComments } from "@/core/pages/comments";
import { CommentSection } from "../components/comments/comment-section";

export function ManagedPageComments() {
  const { pageId, path, comments, open, preview, readReceipt } =
    usePageComments();
  return (
    <CommentSection
      contentId={pageId}
      path={path}
      comments={comments}
      open={open}
      interactive={!preview}
      readReceipt={readReceipt}
    />
  );
}
