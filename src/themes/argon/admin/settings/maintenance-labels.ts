import type {
  MaintenanceBundleItem,
  MaintenanceCounts,
  MaintenanceHealthCheck,
} from "@/core/contracts/maintenance";

export const maintenanceKinds = {
  article: "文章",
  shuoshuo: "说说",
  page: "页面",
  glossary: "术语",
  category: "分类",
  tag: "标签",
  comment: "评论",
  template: "页面模板",
  site: "公开站点设置（仅导出）",
} satisfies Record<MaintenanceBundleItem["kind"], string>;

export const importStates = {
  create: { label: "可导入", tone: "positive" },
  skip: { label: "已存在", tone: "neutral" },
  conflict: { label: "有冲突", tone: "warning" },
  blocked: { label: "无法导入", tone: "danger" },
} satisfies Record<keyof MaintenanceCounts, { label: string; tone: string }>;

export const healthChecks = {
  database: { label: "数据库" },
  redis: { label: "Redis" },
  queue: { label: "任务队列", href: "/admin/settings/runtime" },
  media: { label: "媒体存储" },
  mail: { label: "邮件配置", href: "/admin/notifications/platforms" },
  query_cache: {
    label: "后端查询缓存",
    href: "/admin/settings/nodes#query-cache",
  },
} satisfies Record<
  MaintenanceHealthCheck["id"],
  { label: string; href?: string }
>;

export const healthStatuses = {
  ok: { label: "正常", tone: "positive" },
  warning: { label: "需留意", tone: "warning" },
  unavailable: { label: "不可用", tone: "danger" },
  not_configured: { label: "未配置", tone: "neutral" },
} satisfies Record<
  MaintenanceHealthCheck["status"],
  { label: string; tone: string }
>;
