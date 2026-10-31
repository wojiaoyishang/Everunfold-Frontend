import Image from "next/image";
import { Icon } from "./icon";

/** Decorative cover shared by neighbor links and the recommendation strip. */
export function StoryCover({
  src,
  sizes,
}: {
  src: string | null;
  sizes: string;
}) {
  return (
    <span className="story-cover" aria-hidden="true">
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} unoptimized />
      ) : (
        <Icon name="campfire" />
      )}
    </span>
  );
}
