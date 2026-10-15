import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:bg-foreground/85",
        brand: "bg-brand text-white hover:bg-brand-strong",
        secondary: "bg-surface text-foreground hover:bg-surface-strong",
        outline: "border border-line-strong bg-background text-foreground hover:border-foreground",
        ghost: "text-foreground hover:bg-surface",
        danger: "bg-danger text-white hover:bg-danger/90",
        "danger-outline": "border border-danger/30 text-danger hover:bg-danger-soft",
        link: "rounded-none px-0 text-foreground underline-offset-4 hover:underline active:scale-100",
        overlay: "bg-white/90 text-foreground backdrop-blur hover:bg-white",
      },
      size: {
        sm: "h-8 px-3.5 text-sm [&_svg]:size-4",
        md: "h-10 px-5 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-5",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
