import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  size = "lg",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  size?: "lg" | "md";
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1
          className={cn(
            "font-semibold tracking-tight text-balance",
            size === "lg" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-[28px]",
          )}
        >
          {title}
        </h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-[15px] text-muted sm:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
