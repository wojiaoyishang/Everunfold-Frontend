import {
  APPEARANCE_KEY,
  appearance,
  defaultAppearance,
  readableAccent,
  type Appearance,
} from "./appearance-policy";
const changeEvent = "everunfold:appearance";
let current = defaultAppearance;
let siteDefaults = defaultAppearance;
let initialized = false;

function read() {
  try {
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "null");
    const legacy = localStorage.getItem("everunfold.theme");
    current = appearance({
      ...siteDefaults,
      ...(stored ?? {}),
      ...(stored?.mode || !legacy ? {} : { mode: legacy }),
    });
  } catch {
    /* The in-memory preference remains usable. */
  }
  initialized = true;
  return current;
}
export function readAppearance() {
  return initialized ? current : read();
}
export function applyAppearance(value: Appearance) {
  const root = document.documentElement;
  if (value.mode === "system") delete root.dataset.theme;
  else root.dataset.theme = value.mode;
  root.dataset.amoled = String(value.amoled);
  root.dataset.customAccent = String(value.accent !== defaultAppearance.accent);
  root.style.setProperty(
    "--custom-accent-light",
    readableAccent(value.accent, false),
  );
  root.style.setProperty(
    "--custom-accent-dark",
    readableAccent(value.accent, true),
  );
}
export function setAppearance(value: Partial<Appearance>) {
  current = appearance({ ...readAppearance(), ...value });
  applyAppearance(current);
  try {
    localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({
        ...current,
        light: readableAccent(current.accent, false),
        dark: readableAccent(current.accent, true),
      }),
    );
    if (current.mode === "system") localStorage.removeItem("everunfold.theme");
    else localStorage.setItem("everunfold.theme", current.mode);
  } catch {
    /* Optional local preference. */
  }
  window.dispatchEvent(new Event(changeEvent));
}
export function subscribeAppearance(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === APPEARANCE_KEY) {
      applyAppearance(read());
      listener();
    }
  };
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", storage);
  };
}

/** Defaults never overwrite a visitor's explicitly persisted choices. */
export function setSiteAppearance(defaults: Partial<Appearance>) {
  const next = appearance({ ...defaultAppearance, ...defaults });
  if (JSON.stringify(next) === JSON.stringify(siteDefaults)) return;
  siteDefaults = next;
  current = next;
  applyAppearance(read());
  window.dispatchEvent(new Event(changeEvent));
}
