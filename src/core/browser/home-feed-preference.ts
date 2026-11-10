import {
  HOME_FEED_KEY,
  homeFeedType,
  type HomeFeedType,
} from "./home-feed-policy";
const changeEvent = "everunfold:home-feed";
let memory: HomeFeedType | null = null;
let memoryOnly = false;
export function readHomeFeedPreference(): HomeFeedType | null {
  if (!memoryOnly) {
    try {
      const value = localStorage.getItem(HOME_FEED_KEY);
      memory = value ? homeFeedType(value) : null;
    } catch {
      memoryOnly = true;
    }
  }
  return memory;
}
export function setHomeFeedPreference(value: HomeFeedType) {
  memory = homeFeedType(value);
  try {
    localStorage.setItem(HOME_FEED_KEY, memory);
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
  window.dispatchEvent(new Event(changeEvent));
}
export function subscribeHomeFeedPreference(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === HOME_FEED_KEY) {
      memory = event.newValue ? homeFeedType(event.newValue) : null;
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
