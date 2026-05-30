import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-1 text-sm text-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
