/** Values and callbacks are scoped to one host-owned, editable text field. */
export interface AdminFormFieldContext {
  scene: string;
  field: string;
  resourceKey?: string;
  label: string;
  value: string;
  disabled?: boolean;
  maxLength?: number;
  source: () => AdminFormFieldSource | Promise<AdminFormFieldSource>;
  apply: (value: string) => void | boolean;
}

export interface AdminFormFieldSource {
  resourceId?: string;
  language: string;
  title: string;
  summary?: string;
  body?: string;
  restricted?: boolean;
}

export interface AdminFormFieldView {
  placeholder?: string;
  description?: string;
}

export interface AdminFormFieldActionProps {
  field: AdminFormFieldContext;
}

interface FormFieldHookLocation {
  scene: string;
  field: string;
}

interface AdminFormFieldHookBase extends FormFieldHookLocation {
  id: string;
  priority?: number;
}

export type AdminFormFieldHook = AdminFormFieldHookBase &
  (
    | {
        stage: "prepare";
        prepare: (
          view: Readonly<AdminFormFieldView>,
          location: Readonly<FormFieldHookLocation>,
        ) => AdminFormFieldView | void;
      }
    | { stage: "render"; component: string }
  );

export type RegisteredAdminFormFieldHook = AdminFormFieldHook & {
  pluginId: string;
  priority: number;
};

export interface PluginAdminSettingsProps {
  pluginId: string;
  onClose?: () => void;
}
