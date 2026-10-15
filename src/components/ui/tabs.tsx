import Link from "next/link";
import { cn } from "@/lib/utils";

type TabItem = { href: string; label: React.ReactNode; active: boolean; count?: number };

/** Вкладки-ссылки: состояние хранится в URL, работают без JavaScript. */
export function LinkTabs({ items, className, label }: { items: TabItem[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={cn("scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
            item.active ? "bg-foreground text-background" : "text-muted hover:bg-surface hover:text-foreground",
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className={cn("text-xs", item.active ? "text-background/70" : "text-subtle")}>{item.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
