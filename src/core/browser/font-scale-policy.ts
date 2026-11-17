import { fontScaleLimits } from "@/core/settings/theme-options";

export const fontScaleKey = "everunfold.font-scale";
export const fontScaleOverride = "--public-font-scale-override";

export function validFontScale(percent: number) {
  return (
    Number.isInteger(percent) &&
    percent >= fontScaleLimits.min &&
    percent <= fontScaleLimits.max
  );
}

export const initializeFontScale = `(function(){try{var p=Number(localStorage.getItem('${fontScaleKey}'));if(Number.isInteger(p)&&p>=${fontScaleLimits.min}&&p<=${fontScaleLimits.max})document.documentElement.style.setProperty('${fontScaleOverride}',String(p/100));}catch(e){}})();`;
