import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormMessage({ error, success, className }: { error?: string; success?: string; className?: string }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm",
        error ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
        className,
      )}
    >
      {error ? <CircleAlertIcon className="mt-px size-4 shrink-0" /> : <CircleCheckIcon className="mt-px size-4 shrink-0" />}
      <span>{error ?? success}</span>
    </div>
  );
}
