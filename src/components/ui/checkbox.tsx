import { cn } from "@/lib/utils";

/** Нативный чекбокс в стиле интерфейса — работает в формах без JavaScript. */
export function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-[18px] shrink-0 cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-background bg-center bg-no-repeat transition-colors checked:border-foreground checked:bg-foreground checked:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-7'/%3E%3C/svg%3E\")] hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
