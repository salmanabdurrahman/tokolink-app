import * as React from "react";
import { cn } from "@/lib/utils";

export const labelStyles = "text-xs font-medium uppercase tracking-widest text-muted-foreground";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn(labelStyles, className)} {...props} />
  ),
);
Label.displayName = "Label";
export { Label };
