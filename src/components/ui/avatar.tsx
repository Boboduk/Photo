"use client";

import Image from "next/image";
import { useState } from "react";
import { imageLoaderFor } from "@/lib/images";
import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
  "2xl": "size-32 text-3xl",
} as const;

const pixelSizes = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96, "2xl": 128 } as const;

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: keyof typeof sizes;
  className?: string;
};

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-strong font-semibold text-muted select-none",
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={name}
          fill
          sizes={`${pixelSizes[size] * 2}px`}
          loader={imageLoaderFor(src!)}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <>
          <span aria-hidden>{initials(name) || "·"}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  );
}
