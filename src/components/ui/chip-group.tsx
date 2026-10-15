import { cn } from "@/lib/utils";

/** Группа чекбоксов в виде «таблеток». Работает как обычные поля формы. */
export function ChipGroup({
  name,
  options,
  selected,
  onToggle,
  legend,
  error,
  className,
}: {
  name: string;
  options: { value: string; label: string; hint?: string }[];
  selected?: string[];
  onToggle?: (value: string, checked: boolean) => void;
  legend?: React.ReactNode;
  error?: string[];
  className?: string;
}) {
  return (
    <fieldset className={cn("flex flex-col gap-2.5", className)}>
      {legend ? <legend className="mb-2.5 text-sm font-medium">{legend}</legend> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            title={option.hint}
            className="relative inline-flex h-9 cursor-pointer items-center rounded-full border border-line-strong px-4 text-sm font-medium transition-colors select-none hover:border-foreground has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground has-[:focus-visible]:ring-offset-2"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              className="sr-only"
              {...(onToggle
                ? { checked: selected?.includes(option.value) ?? false, onChange: (e) => onToggle(option.value, e.target.checked) }
                : { defaultChecked: selected?.includes(option.value) })}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
