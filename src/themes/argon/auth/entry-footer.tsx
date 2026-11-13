import { UiText } from "@/core/i18n/provider";
import { RouteLink } from "../components/ui/route-link";

export function EntryFooter({
  href,
  label,
  prompt,
}: {
  href: "/login" | "/login/register";
  label: string;
  prompt?: string;
}) {
  return (
    <footer className="login-entry-footer">
      {prompt && (
        <span>
          <UiText text={prompt} />
        </span>
      )}
      <RouteLink href={href} className="login-entry-link">
        <UiText text={label} />
      </RouteLink>
    </footer>
  );
}
