/** Open presentation model. The backend stores configuration independently of these controls. */
export interface SettingField {
  key: string;
  label: string;
  component: string;
  /** Opt a text field into the host's declared admin form scene. */
  authoringAction?: true;
  default?: unknown;
  props?: Readonly<Record<string, unknown>>;
  fields?: readonly SettingField[];
}

export interface SettingsModel {
  fields: readonly SettingField[];
}

export function readSettingsModel(value: unknown): SettingsModel {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as SettingsModel).fields)
  )
    return { fields: [] };
  const parse = (fields: unknown[], depth = 0): SettingField[] => {
    if (depth > 16) return [];
    const seen = new Set<string>();
    return fields.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const field = value as SettingField;
      if (
        typeof field.key !== "string" ||
        !field.key ||
        seen.has(field.key) ||
        typeof field.component !== "string" ||
        !field.component
      )
        return [];
      seen.add(field.key);
      return [
        {
          ...field,
          label: typeof field.label === "string" ? field.label : field.key,
          fields: Array.isArray(field.fields)
            ? parse(field.fields, depth + 1)
            : undefined,
        },
      ];
    });
  };
  return { fields: parse((value as { fields: unknown[] }).fields) };
}
