type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const REDACTED = "[redacted]";
const SENSITIVE_KEY_PATTERN = /token|secret|key|cookie|authorization|password|otp/i;

function redactValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  if (typeof value !== "object") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }
  if (Array.isArray(value)) return value.map(redactValue);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactValue(entry),
    ]),
  );
}

function writeLog(level: LogLevel, message: string, fields: LogFields = {}) {
  const redactedFields = redactValue(fields) as LogFields;
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...redactedFields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => writeLog("info", message, fields),
  warn: (message: string, fields?: LogFields) => writeLog("warn", message, fields),
  error: (message: string, fields?: LogFields) => writeLog("error", message, fields),
};

export function redactLogFields(fields: LogFields) {
  return redactValue(fields) as LogFields;
}
