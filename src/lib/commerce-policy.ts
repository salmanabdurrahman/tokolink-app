export const PLATFORM_FEE_RATE = 0.015;
export const WITHDRAWAL_HOLD_DAYS = 2;
export const MIN_WITHDRAWAL_AMOUNT = 50_000;

export const DEFAULT_COURIERS = [
  "jne",
  "jnt",
  "sicepat",
  "anteraja",
  "pos",
  "tiki",
  "ninja",
] as const;

export type DefaultCourier = (typeof DEFAULT_COURIERS)[number];

// Retention for tables that would otherwise grow unbounded from public/auth
// traffic. Used by `scripts/cleanup-auth-data.ts`.
export const AUTH_RATE_LIMIT_RETENTION_DAYS = 1;
export const AUTH_AUDIT_LOG_RETENTION_DAYS = 90;
export const VERIFICATION_CODE_GRACE_DAYS = 1;
export const CANCELED_ORDER_RETENTION_DAYS = 180;
// Merchant funnel dashboard only needs recent trend data; pre-aggregated
// daily rows are cheap, but retention still bounds unbounded growth.
export const ANALYTICS_DAILY_RETENTION_DAYS = 180;
