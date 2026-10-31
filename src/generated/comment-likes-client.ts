/* Generated from backend operation metadata. Do not edit by hand. */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "./comment-likes-v0.1.schema.json";
import type { CommentLikesContract } from "./comment-likes-contract";
import {
  requestJSON,
  mutateJSON,
  type RequestOptions,
} from "@/core/http/request";
const ajv = new Ajv({ strict: true });
addFormats(ajv);
ajv.addSchema(
  Object.fromEntries(
    Object.entries(schema).filter(([key]) => !key.startsWith("x-")),
  ),
  "comment-likes",
);

const readCommentLikesValidator = ajv.compile<CommentLikesContract["states"]>({
  $ref: "comment-likes#/properties/states",
});
export function readCommentLikes(
  baseUrl: string,
  input: CommentLikesContract["query"],
  visitor: string,
  options: RequestOptions = {},
) {
  return requestJSON(
    baseUrl,
    "/v1/comments/likes",
    input,
    readCommentLikesValidator,
    {
      ...options,
      headers: { ...options.headers, "X-Everunfold-Visitor": visitor },
    },
  );
}

const setCommentLikeValidator = ajv.compile<CommentLikesContract["state"]>({
  $ref: "comment-likes#/properties/state",
});
export function setCommentLike(
  baseUrl: string,
  commentId: string,
  input: CommentLikesContract["mutation"],
  visitor: string,
  options: RequestOptions = {},
) {
  return mutateJSON(
    baseUrl,
    "/v1/comments/{comment_id}/like".replace(
      "{comment_id}",
      encodeURIComponent(commentId),
    ),
    input,
    setCommentLikeValidator,
    {
      ...options,
      headers: { ...options.headers, "X-Everunfold-Visitor": visitor },
    },
  );
}
