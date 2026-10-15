import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-16 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-surface text-muted">
          <Icon className="size-5" />
        </span>
      ) : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      {text ? <p className="mt-1.5 max-w-md text-[15px] text-muted">{text}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
