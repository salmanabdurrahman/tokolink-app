import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export function getErrorMessage(err: any): string {
  if (!err) return "";
  const msg = err.message || String(err);
  try {
    if (typeof msg === "string" && msg.trim().startsWith("[")) {
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
        const first = parsed[0];
        const pathStr = first.path && first.path.length > 0 ? `${first.path.join(".")} - ` : "";
        return `${pathStr}${first.message}`;
      }
    }
  } catch (e) {
    // Fail-safe to return original message
  }
  return msg;
}
