import type { PublicShortcode } from "@/core/contracts/settings";
import type { ShortcodeEditorProps } from "@/core/plugins/types";
import { pluginRegistry } from "@/core/plugins/registry";
import { RuntimeComponent } from "@/core/plugins/runtime/view";
import { glossaryShortcode } from "@/core/shortcodes/glossary";
import { GlossaryShortcodeEditor } from "./glossary-fields";
import { VideoShortcodeEditor } from "./video-editor";
import { videoShortcode } from "@/core/video/shortcode";

export function shortcodeEditor(definition?: PublicShortcode) {
  if (!definition) return undefined;
  if (definition.id === glossaryShortcode.id) return GlossaryShortcodeEditor;
  if (definition.id === videoShortcode.id) return VideoShortcodeEditor;
  return pluginRegistry.shortcode(definition)?.editor;
}

export function RegisteredShortcodeEditor({
  editor: Editor,
  ...props
}: ShortcodeEditorProps & {
  editor: NonNullable<ReturnType<typeof shortcodeEditor>>;
}) {
  return typeof Editor === "string" ? (
    <RuntimeComponent name={Editor} {...props} />
  ) : (
    <Editor {...props} />
  );
}
