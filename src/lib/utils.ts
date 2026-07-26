import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCurrency } from "./formatters";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatIDR = formatCurrency;

export function getErrorMessage(err: unknown): string {
  if (!err) return "";
  const msg = err instanceof Error ? err.message : String(err);
  if (typeof msg === "string" && msg.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
        const first = parsed[0];
        const pathStr = first.path?.length ? `${first.path.join(".")} - ` : "";
        return `${pathStr}${first.message}`;
      }
    } catch {
      return msg;
    }
  }
  return msg;
}

export function formatWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function isValidWhatsAppNumber(formattedPhone: string) {
  return /^62\d{9,15}$/.test(formattedPhone);
}
