import * as React from "react";
import { cn } from "@/lib/utils";
import { labelStyles } from "./label";

interface FieldProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: string;
  children: React.ReactNode;
}

const Field = React.forwardRef<HTMLLabelElement, FieldProps>(
  ({ label, children, className, ...props }, ref) => (
    <label ref={ref} className={cn("block", className)} {...props}>
      <span className={labelStyles}>{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  ),
);
Field.displayName = "Field";
export { Field };
export type { FieldProps };
