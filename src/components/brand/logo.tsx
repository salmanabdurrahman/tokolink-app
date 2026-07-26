import { cn } from "@/lib/utils";

interface TokolinkLogoProps {
  size?: number;

  showWordmark?: boolean;
  className?: string;
}

export function TokolinkLogo({
  size = 32,
  showWordmark = false,
  className = "",
}: TokolinkLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="48" y="76" width="160" height="48" rx="24" fill="var(--lime)" />
        <rect x="104" y="44" width="48" height="168" rx="24" fill="var(--foreground)" />
        <circle cx="128" cy="100" r="10" fill="var(--lime)" />
      </svg>
      {showWordmark && (
        <span className="font-display font-semibold tracking-tight leading-none text-foreground text-lg">
          tokolink
          <span className="text-foreground/30">/</span>
        </span>
      )}
    </span>
  );
}
