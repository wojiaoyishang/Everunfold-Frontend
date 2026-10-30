import {
  MOTION_STORAGE_KEY,
  motionPreference,
  resolveMotion,
  type MotionPreference,
} from "./motion-policy";

export const MOTION_EVENT = "everunfold:motion-change";
let memoryPreference: MotionPreference = "full";

export function readMotionPreference(): MotionPreference {
  try {
    return motionPreference(
      localStorage.getItem(MOTION_STORAGE_KEY) ?? memoryPreference,
    );
  } catch {
    return memoryPreference;
  }
}

export function motionEnabled(): boolean {
  return resolveMotion(
    readMotionPreference(),
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}

export function motionSnapshot(): string {
  return `${readMotionPreference()}:${Number(motionEnabled())}`;
}

function applyMotion() {
  document.documentElement.dataset.motion = motionEnabled()
    ? "full"
    : "reduced";
}

export function setMotionPreference(value: MotionPreference): void {
  memoryPreference = value;
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, value);
  } catch {
    /* Optional preference. */
  }
  applyMotion();
  window.dispatchEvent(new Event(MOTION_EVENT));
}

export function subscribeMotion(listener: () => void): () => void {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const change = () => {
    applyMotion();
    listener();
  };
  const storage = (event: StorageEvent) => {
    if (!event.key || event.key === MOTION_STORAGE_KEY) {
      memoryPreference = motionPreference(event.newValue);
      change();
    }
  };
  applyMotion();
  window.addEventListener(MOTION_EVENT, change);
  window.addEventListener("storage", storage);
  media.addEventListener("change", change);
  return () => {
    window.removeEventListener(MOTION_EVENT, change);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", change);
  };
}
