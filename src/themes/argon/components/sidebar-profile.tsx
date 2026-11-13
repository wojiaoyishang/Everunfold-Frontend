import Image from "next/image";
import type { ReactNode } from "react";
import type { Site } from "@/core/content/types";
import { publicHref, resourceUrl } from "@/core/content/urls";
import { themeProfile } from "@/core/settings/theme-options";
import { UiText, useT } from "@/core/i18n/provider";
import { sidebarProfile, sidebarStats } from "../sidebar-profile";
import { Icon } from "./icon";
import { AppLink } from "./navigation-link";
import { useNavigation } from "./navigation-state";
import { TextLink } from "./ui/primitives";

function ProfileLink({
  href: input,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const { setOpen } = useNavigation();
  const href = publicHref(input);
  if (!href) return <span className={className}>{children}</span>;
  return href.startsWith("/") ? (
    <AppLink
      className={className}
      href={href}
      onNavigate={() => setOpen(false)}
    >
      {children}
    </AppLink>
  ) : (
    <TextLink
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </TextLink>
  );
}

export function SidebarProfile({ site }: { site: Site }) {
  const t = useT();
  const theme = themeProfile(site.settings);
  const profile = sidebarProfile(site, theme?.sidebar_profile);
  const avatar = resourceUrl(theme?.author_avatar_url ?? site.avatar_url);
  const tagline = site.settings?.site.author_tagline || site.description;
  return (
    <div className="profile">
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          width={96}
          height={96}
          className="profile-avatar"
          unoptimized
        />
      ) : (
        <div className="profile-avatar avatar-placeholder" aria-hidden="true">
          <Icon name="campfire" />
        </div>
      )}
      <h2 id="profile-title">{profile.display_name}</h2>
      {profile.show_tagline && tagline && <p>{tagline}</p>}
      {profile.show_stats && (
        <div className="site-stats">
          {sidebarStats.map(({ key, url, label }) => (
            <ProfileLink key={key} className="profile-stat" href={profile[url]}>
              <strong>{site.stats[key]}</strong>
              <span>
                <UiText text={label} />
              </span>
            </ProfileLink>
          ))}
        </div>
      )}
      {profile.personal_links.length > 0 && (
        <ul className="profile-links" aria-label={t("个人链接按钮")}>
          {profile.personal_links.map((link) => (
            <li key={link.id}>
              <ProfileLink href={link.href} className="profile-link-button">
                {link.label}
              </ProfileLink>
            </li>
          ))}
        </ul>
      )}
      {profile.friend_links.length > 0 && (
        <section
          className="profile-friends"
          aria-label={profile.friends_title || t("友情链接")}
        >
          {profile.friends_title && (
            <h3>
              <Icon name="link" />
              {profile.friends_title}
            </h3>
          )}
          <ul>
            {profile.friend_links.map((link) => (
              <li key={link.id}>
                <ProfileLink href={link.href}>{link.label}</ProfileLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
