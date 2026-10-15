"use client";

import { ImageOffIcon } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { imageLoaderFor } from "@/lib/images";
import { cn } from "@/lib/utils";

/**
 * next/image с загрузчиком для внешних демо-изображений и аккуратной заглушкой,
 * если файл недоступен.
 */
export function SmartImage({ src, alt, className, ...props }: Omit<ImageProps, "src" | "loader"> & { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-surface to-surface-strong text-subtle",
          props.fill ? "absolute inset-0" : "",
          className,
        )}
        style={props.fill ? undefined : { width: Number(props.width) || undefined, aspectRatio: props.width && props.height ? `${props.width}/${props.height}` : undefined }}
      >
        <ImageOffIcon className="size-6" />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      loader={imageLoaderFor(src)}
      onError={() => setFailed(true)}
      className={className}
      {...props}
    />
  );
}
