import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Знак: рамка видоискателя с точкой фокуса акцентного цвета. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M3 8.5V3h5.5M15.5 3H21v5.5M21 15.5V21h-5.5M8.5 21H3v-5.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="3.2" fill="var(--color-brand)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-[22px]" />
      <span className="text-[17px] leading-none font-semibold tracking-[0.2em]">{brand.name}</span>
    </span>
  );
}
