/** Shared copy for the pre-render HTTP gate and React error boundaries. */
export type FailureStatus = 404 | 500 | 503;
export function failurePage(status: FailureStatus) {
  return status === 404
    ? {
        code: "404",
        title: "页面未找到",
        description: "请检查访问地址，或返回首页查看其他内容。",
      }
    : status === 503
      ? {
          code: "503",
          title: "页面加载失败",
          description: "后端同步失败，暂时无法读取这页内容。请稍后重试。",
        }
      : {
          code: "500",
          title: "页面显示出错了",
          description: "这页暂时无法正常显示，请重试或返回首页。",
        };
}
