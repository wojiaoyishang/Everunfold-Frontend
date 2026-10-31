/* Generated from the backend public contract. Do not edit by hand. */

/**
 * @minItems 1
 * @maxItems 50
 */
export type Ids = string[];
export type Liked = boolean;
export type Success = boolean;
export type Code = number;
export type Msg = string;
export type CommentId = string;
export type Liked1 = boolean;
export type Count = number;
export type Items = CommentLikeState[];
export type Success1 = boolean;
export type Code1 = number;
export type Msg1 = string;

export interface CommentLikesContract {
  query: CommentLikesQuery;
  mutation: CommentLikeInput;
  states: PublicResponseCommentLikes;
  state: PublicResponseCommentLikeState;
}
export interface CommentLikesQuery {
  ids: Ids;
}
export interface CommentLikeInput {
  liked: Liked;
}
export interface PublicResponseCommentLikes {
  success?: Success;
  code?: Code;
  msg?: Msg;
  data: CommentLikes;
}
export interface CommentLikes {
  items: Items;
}
export interface CommentLikeState {
  comment_id: CommentId;
  liked: Liked1;
  count: Count;
}
export interface PublicResponseCommentLikeState {
  success?: Success1;
  code?: Code1;
  msg?: Msg1;
  data: CommentLikeState;
}
