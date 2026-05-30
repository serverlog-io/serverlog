import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-bg-elevated/40 px-3 py-1 text-sm text-fg transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-fg-subtle focus:outline-none focus:border-accent/50 focus:bg-bg-elevated/60 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
