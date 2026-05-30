import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-fg hover:bg-accent-hover shadow-[0_0_24px_-8px_rgba(217,119,87,0.55)]",
        destructive:
          "bg-destructive/90 text-fg hover:bg-destructive",
        outline:
          "border border-border-strong bg-transparent text-fg-muted hover:bg-bg-elevated hover:text-fg hover:border-fg-subtle",
        secondary:
          "bg-bg-elevated text-fg border border-border hover:border-border-strong",
        ghost: "text-fg-muted hover:bg-bg-elevated hover:text-fg",
        link: "text-fg-muted underline-offset-4 hover:underline hover:text-fg",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
