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
