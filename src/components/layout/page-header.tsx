import type { ReactNode } from "react";

interface PageHeaderProps {
  label: string;

  title: string;

  action?: ReactNode;
}

export function PageHeader({ label, title, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <h1 className="font-display mt-2 text-4xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
