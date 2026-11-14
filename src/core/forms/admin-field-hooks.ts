import type {
  AdminFormFieldContext,
  AdminFormFieldHook,
  AdminFormFieldView,
  RegisteredAdminFormFieldHook,
} from "./admin-field-types";

const hookKey = /^[a-z][a-z0-9_.-]{0,127}$/;

export function validateAdminFormFieldHook(hook: AdminFormFieldHook) {
  if (
    !hook ||
    typeof hook.id !== "string" ||
    typeof hook.scene !== "string" ||
    typeof hook.field !== "string" ||
    !hookKey.test(hook.id) ||
    !hookKey.test(hook.scene) ||
    !hookKey.test(hook.field) ||
    (hook.priority !== undefined && !Number.isSafeInteger(hook.priority)) ||
    !(hook.stage === "prepare"
      ? typeof hook.prepare === "function"
      : hook.stage === "render" && typeof hook.component === "string")
  )
    throw new Error("Invalid admin form field hook");
}

function compareKeys(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compareAdminFormFieldHooks(
  a: RegisteredAdminFormFieldHook,
  b: RegisteredAdminFormFieldHook,
) {
  return (
    a.priority - b.priority ||
    compareKeys(a.pluginId, b.pluginId) ||
    compareKeys(a.id, b.id)
  );
}

export function prepareAdminFormField(
  field: Pick<AdminFormFieldContext, "scene" | "field">,
  view: AdminFormFieldView,
  hooks: readonly RegisteredAdminFormFieldHook[],
) {
  const location = Object.freeze({ scene: field.scene, field: field.field });
  let current = view;
  for (const hook of hooks) {
    if (
      hook.stage !== "prepare" ||
      hook.scene !== field.scene ||
      hook.field !== field.field
    )
      continue;
    try {
      const update = hook.prepare(Object.freeze({ ...current }), location);
      if (update instanceof Promise) {
        void update.catch(() => {});
        continue;
      }
      if (!update) continue;
      const { placeholder, description } = update;
      current = {
        placeholder:
          typeof placeholder === "string" ? placeholder : current.placeholder,
        description:
          typeof description === "string" ? description : current.description,
      };
    } catch {
      /* Leave the host's field intact if a presentation hook fails. */
    }
  }
  return current;
}
