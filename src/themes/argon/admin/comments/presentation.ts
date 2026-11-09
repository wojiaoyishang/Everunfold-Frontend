import type {
  ModerateComments,
  ModerationItem,
} from "@/core/contracts/operations";
import type { IconName } from "../../components/icon";
import type { AdminActionTone } from "../components/action-button";

export type CommentAction = ModerateComments["action"];
type Presentation = {
  label: string;
  icon: IconName;
  tone: Exclude<AdminActionTone, "accent">;
};

export const commentActions = {
  approve: { label: "通过审核", icon: "check", tone: "positive" },
  pending: { label: "撤回审核", icon: "undo", tone: "neutral" },
  reject: { label: "不通过", icon: "close", tone: "danger" },
  spam: { label: "标为垃圾", icon: "warning", tone: "warning" },
  trash: { label: "移至回收站", icon: "trash", tone: "danger" },
  restore: { label: "恢复评论", icon: "rotate", tone: "positive" },
} as const satisfies Record<CommentAction, Presentation>;

export const commentStatuses = {
  pending: { label: "待审核", icon: "clock", tone: "warning" },
  approved: { label: "已通过", icon: "check", tone: "positive" },
  rejected: { label: "未通过", icon: "close", tone: "danger" },
  spam: { label: "垃圾评论", icon: "warning", tone: "warning" },
  trash: { label: "回收站", icon: "trash", tone: "neutral" },
  hidden: { label: "已隐藏", icon: "eye-off", tone: "neutral" },
} as const satisfies Record<ModerationItem["status"], Presentation>;

export const commentTargets = {
  article: { label: "文章", icon: "book" },
  shuoshuo: { label: "说说", icon: "leaf" },
  page: { label: "页面", icon: "copy" },
} as const satisfies Record<
  ModerationItem["content_type"],
  { label: string; icon: IconName }
>;
