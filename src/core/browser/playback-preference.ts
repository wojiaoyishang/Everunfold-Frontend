import {
  PLAYBACK_STORAGE_KEY,
  playbackPreference,
  type PlaybackPreference,
} from "./playback-policy";

const changeEvent = "everunfold:background-preference";
let memory: PlaybackPreference = "auto";
let memoryOnly = false;

export function readPlaybackPreference(): PlaybackPreference {
  if (!memoryOnly) {
    try {
      memory = playbackPreference(localStorage.getItem(PLAYBACK_STORAGE_KEY));
    } catch {
      memoryOnly = true;
    }
  }
  return memory;
}

export function setPlaybackPreference(value: PlaybackPreference): void {
  memory = value;
  try {
    localStorage.setItem(PLAYBACK_STORAGE_KEY, value);
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function subscribePlaybackPreference(listener: () => void): () => void {
  function storage(event: StorageEvent) {
    if (event.key === null || event.key === PLAYBACK_STORAGE_KEY) {
      memory = playbackPreference(event.newValue);
      listener();
    }
  }
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", storage);
  };
}
