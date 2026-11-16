/** Shared copy for the pre-render HTTP gate and React error boundaries. */
export type FailureStatus = 404 | 500 | 503;
export const httpFailureKinds = [
  404,
  503,
  "content-sync",
  "plugin-sync",
] as const;
export type HttpFailureKind = (typeof httpFailureKinds)[number];
export type FailureKind = HttpFailureKind | 500;

type FailureCopy = {
  status: FailureStatus;
  title: string;
  description: string;
  adminHint?: string;
};

const pages: Record<FailureKind, FailureCopy> = {
  404: {
    status: 404,
    title: "页面未找到",
    description: "请检查访问地址，或返回首页查看其他内容。",
  },
  500: {
    status: 500,
    title: "页面显示出错了",
    description: "这页暂时无法正常显示，请重试或返回首页。",
  },
  503: {
    status: 503,
    title: "页面加载失败",
    description: "这页暂时无法打开，请稍后重试。",
  },
  "content-sync": {
    status: 503,
    title: "站点数据尚未同步",
    description: "当前站点节点还没有可读取的公开内容，请稍后重试。",
    adminHint: "请管理员查看同步日志，确认同步状态。",
  },
  "plugin-sync": {
    status: 503,
    title: "后端插件清单尚未同步",
    description: "当前页面依赖的插件尚未完成部署登记，请稍后重试。",
    adminHint: "管理员请查看后端部署日志，确认当前版本的插件清单是否已同步。",
  },
};

export function failurePage(kind: FailureKind): FailureCopy {
  return pages[kind];
}
