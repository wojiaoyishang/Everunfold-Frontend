"use client";
import { useState } from "react";

/** Raster/avatar URLs remain isolated image resources; never inject uploaded markup. */
export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span
      className={`ui-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(14, size * 0.35) }}
    >
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          decoding="async"
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-label={name}>{Array.from(name.trim())[0] || "?"}</span>
      )}
    </span>
  );
}
