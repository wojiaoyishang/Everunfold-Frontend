import {
  HOME_FEED_KEY,
  homeFeedType,
  type HomeFeedType,
} from "./home-feed-policy";
const changeEvent = "everunfold:home-feed";
let memory: HomeFeedType = "all";
let memoryOnly = false;
export function readHomeFeedPreference(): HomeFeedType {
  if (!memoryOnly) {
    try {
      memory = homeFeedType(localStorage.getItem(HOME_FEED_KEY));
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
      memory = homeFeedType(event.newValue);
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
