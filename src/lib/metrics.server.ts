import { logger } from "./logger.server";

export type MetricEvent =
  | "signup_success"
  | "signup_fail"
  | "otp_fail"
  | "upload_fail"
  | "tenant_create_fail"
  | "pakasir_webhook_fail"
  | "rajaongkir_fail"
  | "withdrawal_request";

export function recordMetric(event: MetricEvent, fields: Record<string, unknown> = {}) {
  logger.info("metric", { event, ...fields });
}
