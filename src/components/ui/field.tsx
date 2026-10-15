import { cn } from "@/lib/utils";
import { Label } from "./label";

type FieldProps = {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | string[];
  optional?: string;
  className?: string;
  children: React.ReactNode;
};

/** Поле формы: подпись, подсказка и сообщение об ошибке, связанные через aria. */
export function Field({ label, htmlFor, hint, error, optional, className, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="flex items-baseline gap-1.5">
          {label}
          {optional ? <span className="text-xs font-normal text-subtle">{optional}</span> : null}
        </Label>
      ) : null}
      {children}
      {message ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-[13px] text-danger">
          {message}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria-атрибуты для поля, обёрнутого в <Field>. */
export function fieldAria(id: string, error?: string | string[], hint?: boolean) {
  const hasError = Array.isArray(error) ? error.length > 0 : Boolean(error);
  return {
    id,
    "aria-invalid": hasError || undefined,
    "aria-describedby": hasError ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}
