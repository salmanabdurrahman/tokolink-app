import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition duration-200 focus:border-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";
