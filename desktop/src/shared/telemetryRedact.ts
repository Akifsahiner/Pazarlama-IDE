/**
 * Part 18 — Redact PII and secrets before product telemetry leaves the machine.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const ABS_PATH_RE = /(?:\/Users\/|\/home\/|C:\\|D:\\)[^\s"',]+/g;
const TOKEN_PARAM_RE = /([?&](?:token|key|secret|code|auth)=)[^&\s"']+/gi;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

const SENSITIVE_KEYS = new Set([
  "email",
  "assignee_contact",
  "assignee_email",
  "proof_url",
  "url",
  "path",
  "file_path",
  "project_path",
  "token",
  "api_token",
  "password",
  "secret",
  "authorization",
]);

function redactString(value: string): string {
  return value
    .replace(EMAIL_RE, "[email]")
    .replace(ABS_PATH_RE, "[path]")
    .replace(TOKEN_PARAM_RE, "$1[redacted]")
    .replace(BEARER_RE, "Bearer [redacted]");
}

export function redactTelemetryValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactTelemetryValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = "[redacted]";
      } else {
        out[key] = redactTelemetryValue(val, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

export function redactTelemetryProps(
  props?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const redacted = redactTelemetryValue(props) as Record<string, unknown>;
  return redacted;
}
