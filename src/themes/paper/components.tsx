"use client";
import type { Site } from "@/core/content/types";
import type { ThemeTemplateProps } from "@/core/extensions/types";
import { ParentThemeComponent } from "@/core/extensions/components";
import { UiText } from "@/core/i18n/provider";

function PaperHero({ site }: { site: Site }) {
  return (
    <div className="paper-hero" data-paper-hero>
      <ParentThemeComponent name="public.hero" site={site} />
    </div>
  );
}
function PeopleLayout({ children }: ThemeTemplateProps) {
  return (
    <div className="paper-people" data-paper-page>
      {children}
    </div>
  );
}
function FooterNote() {
  return (
    <p className="paper-footer-note">
      <UiText text="纸间主题" /> · Argon
    </p>
  );
}
const components = {
  "public.hero": PaperHero,
  "paper.people": PeopleLayout,
  "paper.footer-note": FooterNote,
};

export default components;
