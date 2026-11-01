import { Icon, isBuiltinIcon } from "./icon";
/** Uploaded SVGs are always isolated image resources, never injected into the document. */
export function LibraryIcon({
  name = "link",
  url,
  className = "",
}: {
  name?: string;
  url?: string;
  className?: string;
}) {
  if (isBuiltinIcon(name)) return <Icon name={name} className={className} />;
  if (name.startsWith("media:") && url && /^https?:\/\//.test(url)) {
    // Backend validates originals; SVG must retain the browser's image isolation boundary.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={`icon library-icon ${className}`}
        style={{ objectFit: "contain" }}
        src={url}
        alt=""
        width={24}
        height={24}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <Icon name="image" className={className} />;
}
