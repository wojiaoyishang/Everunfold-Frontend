export type MotionPreference = "full" | "system" | "reduced";
export const MOTION_STORAGE_KEY = "everunfold.motion.v1";

export function motionPreference(value: unknown): MotionPreference {
  return value === "system" || value === "reduced" ? value : "full";
}

export function resolveMotion(
  preference: MotionPreference,
  systemReduced: boolean,
): boolean {
  return preference === "full" || (preference === "system" && !systemReduced);
}

// Set before first paint; a saved reduced mode must not briefly animate on reload.
export const initializeMotion = `(function(){var p='full';try{var v=localStorage.getItem('${MOTION_STORAGE_KEY}');if(v==='system'||v==='reduced')p=v;}catch(e){}document.documentElement.dataset.motion=(p==='full'||(p==='system'&&!matchMedia('(prefers-reduced-motion: reduce)').matches))?'full':'reduced';})();`;
