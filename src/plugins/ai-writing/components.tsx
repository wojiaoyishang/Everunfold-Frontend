import { RouteLink, Icon, UiText } from "@everunfold/plugin-sdk/client";
import { GenerationAction } from "./generation-action";
import { WritingSettings } from "./settings";

function WritingWorkspace() {
  return (
    <RouteLink
      href="/admin/plugins/core.ai-writing/settings"
      className="admin-button"
    >
      <Icon name="writing" />
      <UiText text="配置写作助手" />
    </RouteLink>
  );
}

const components = {
  "core.ai-writing.workspace": WritingWorkspace,
  "core.ai-writing.generate": GenerationAction,
  "core.ai-writing.settings": WritingSettings,
};

export default components;
