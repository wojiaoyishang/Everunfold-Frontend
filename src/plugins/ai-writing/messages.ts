import { useLocale } from "@everunfold/plugin-sdk/client";
import { WritingRequestError } from "./client";

const english: Record<string, string> = {
  "AI 辅助生成": "Write with AI",
  "关闭 AI 辅助生成": "Close AI writing",
  "启用 AI 写作助手": "Enable AI writing",
  通用: "General",
  服务商: "Providers",
  模型服务商: "Model providers",
  添加服务商: "Add provider",
  "未配置服务商。": "No providers configured.",
  编辑服务商: "Edit provider",
  未命名服务商: "Untitled provider",
  服务商名称: "Provider name",
  默认服务商: "Default provider",
  设为默认: "Set as default",
  删除服务商: "Remove provider",
  "保存后，此服务商将从生成选项中移除。":
    "This provider will be removed from the generation options when you save.",
  "保存后将移除此服务商，并停用 AI 写作助手。":
    "Saving will remove this provider and disable AI writing.",
  "启用写作助手前，请至少配置一个服务商。":
    "Configure at least one provider before enabling AI writing.",
  "请填写服务商名称、有效的接口地址和模型。":
    "Enter a provider name, a valid API base URL, and a model.",
  "服务商名称不能重复。": "Provider names must be unique.",
  "保存更改后即可测试连接。": "Save changes to test the connection.",
  "使用 API Key 时，接口地址必须为 HTTPS。":
    "Use an HTTPS API base URL when an API key is configured.",
  接口地址: "API base URL",
  "模型 ID": "Model ID",
  保留现有密钥: "Keep the current key",
  可填写密钥: "Optional API key",
  移除现有密钥: "Remove the current key",
  "更换接口来源后，请填写新密钥或移除现有密钥。":
    "Enter a new key or remove the current key after changing the provider origin.",
  生成入口: "Writing actions",
  生成服务商: "Generation provider",
  "暂无可用的生成服务商。": "No writing providers are available.",
  文章: "Articles",
  说说: "Short posts",
  页面: "Pages",
  术语: "Glossary",
  站点设置: "Site settings",
  摘要: "Excerpt",
  页面说明: "Page description",
  简短提示: "Short definition",
  站点简介: "Site description",
  搜索标题: "Search title",
  搜索描述: "Search description",
  分享标题: "Share title",
  分享描述: "Share description",
  "正在读取配置…": "Loading settings…",
  "配置暂时无法读取。": "Could not load the settings.",
  重试: "Retry",
  重新读取配置: "Reload settings",
  "配置有更新。重新读取后再保存。":
    "The settings changed. Reload them before saving.",
  "连接中断。请重新读取配置后确认保存结果。":
    "Connection interrupted. Reload the settings to check whether the save completed.",
  保存更改: "Save changes",
  "正在保存…": "Saving…",
  配置已保存: "Settings saved",
  "请填写有效的接口地址和模型。": "Enter a valid API base URL and model.",
  "接口配置无效。请检查地址、模型和密钥。":
    "Check the API address, model and key.",
  测试连接: "Test connection",
  测试通过: "Connection verified",
  "正在排队…": "Queued…",
  "正在生成…": "Generating…",
  "正在测试…": "Testing…",
  "正在读取素材…": "Loading material…",
  "素材暂时无法读取。": "Could not load the material.",
  "请先填写可用于生成的内容。": "Add some source text before generating.",
  "发送素材有变化，请核对后重新点击生成。":
    "The material changed. Review it and click Generate again.",
  将发送给模型的素材: "Material sent to the model",
  将发送给: "Send to",
  标题: "Title",
  正文片段: "Body excerpt",
  "受限内容的正文和摘要留在站内。可手动填写要发送的主题。":
    "The restricted body and excerpt stay on this site. You can enter a topic to send.",
  填写主题: "Enter a topic",
  生成: "Generate",
  重新生成: "Regenerate",
  查看结果: "Check result",
  建议文案: "Suggested text",
  采用: "Use suggestion",
  确认覆盖: "Replace current text",
  "生成期间此字段已修改。采用建议会覆盖当前内容。":
    "This field changed during generation. Using the suggestion will replace the current text.",
  "文案超出字段长度限制，请重新生成。":
    "The suggestion exceeds the field limit. Generate it again.",
  "当前字段已改变，请重新打开生成窗口。":
    "The field context changed. Reopen the writing dialog.",
  "当前帐号无法执行此操作，或该字段已停用。":
    "This action is unavailable for your account or the field is disabled.",
  "请先登入后台。": "Sign in to the admin workspace first.",
  "请求较多，请稍后再试。": "Too many requests. Try again later.",
  "请求已失效，请重新生成。": "The request expired. Generate it again.",
  "连接中断。可以先查看原请求结果。":
    "Connection interrupted. Check the existing request first.",
  "AI 写作暂时不可用。": "AI writing is currently unavailable.",
  "模型配置已更改。请关闭并重新打开生成窗口。":
    "Model settings changed. Reopen the writing dialog.",
  "内容或授权已改变，无法生成。": "The content or editing permission changed.",
  "排队超时，请重试。": "The job timed out in the queue. Try again.",
  "请求结果未知，请手动重试。": "The result is unknown. Try again manually.",
  "模型响应超时，请稍后再试。": "The model timed out. Try again later.",
  "暂时无法连接模型。": "Could not reach the model.",
  "模型服务拒绝了密钥。": "The model provider rejected the key.",
  "模型服务限流，请稍后再试。": "The model provider rate limited this request.",
  "模型服务未接受请求，请检查配置。":
    "The model provider rejected the request. Check the settings.",
  "模型没有返回合适的文案，请重新生成。":
    "The model did not return a usable suggestion. Generate it again.",
};

export function useWritingText() {
  const { uiLocale } = useLocale();
  return (text: string) => (uiLocale === "en" ? (english[text] ?? text) : text);
}

const jobErrors: Record<string, string> = {
  configuration_changed: "模型配置已更改。请关闭并重新打开生成窗口。",
  access_changed: "内容或授权已改变，无法生成。",
  queue_timeout: "排队超时，请重试。",
  interrupted: "请求结果未知，请手动重试。",
  timeout: "模型响应超时，请稍后再试。",
  provider_unavailable: "暂时无法连接模型。",
  provider_auth: "模型服务拒绝了密钥。",
  provider_rate_limit: "模型服务限流，请稍后再试。",
  provider_request: "模型服务未接受请求，请检查配置。",
  invalid_output: "模型没有返回合适的文案，请重新生成。",
};

export function jobError(code?: string | null) {
  return (code && jobErrors[code]) || "AI 写作暂时不可用。";
}

export function requestError(error: unknown, configuration = false) {
  if (!(error instanceof WritingRequestError))
    return configuration
      ? "连接中断。请重新读取配置后确认保存结果。"
      : "连接中断。可以先查看原请求结果。";
  switch (error.status) {
    case 401:
      return "请先登入后台。";
    case 403:
      return "当前帐号无法执行此操作，或该字段已停用。";
    case 404:
      return "请求已失效，请重新生成。";
    case 409:
      return configuration
        ? "配置有更新。重新读取后再保存。"
        : "模型配置已更改。请关闭并重新打开生成窗口。";
    case 422:
      return configuration
        ? "接口配置无效。请检查地址、模型和密钥。"
        : "内容或授权已改变，无法生成。";
    case 429:
      return "请求较多，请稍后再试。";
    default:
      return "AI 写作暂时不可用。";
  }
}
