import { themeModules } from "./discovered";
import { collectThemes } from "./component-descriptors";

export const themeRegistry = collectThemes(Object.values(themeModules));
