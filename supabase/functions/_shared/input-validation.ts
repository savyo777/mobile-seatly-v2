export type ValidationFieldError = {
  field: string;
  code: string;
  message: string;
};

export class InputValidationError extends Error {
  code: string;
  field?: string;
  status: number;

  constructor(code: string, message: string, field?: string, status = 400) {
    super(message);
    this.name = "InputValidationError";
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const INVISIBLE_DIRECTIONAL_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function stripUnsafeControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, "").replace(INVISIBLE_DIRECTIONAL_CHARS, "");
}

export async function readJsonObject(
  req: Request,
  options: { maxBytes?: number } = {},
): Promise<Record<string, unknown>> {
  const maxBytes = options.maxBytes ?? 64 * 1024;
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new InputValidationError("payload_too_large", "Request body is too large.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new InputValidationError("invalid_json", "Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InputValidationError("invalid_body", "Request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

export function asText(
  value: unknown,
  field: string,
  options: { required?: boolean; maxLength?: number; multiline?: boolean } = {},
): string | null {
  if (value == null) {
    if (options.required) throw new InputValidationError("required", "This field is required.", field);
    return null;
  }
  if (typeof value !== "string") {
    throw new InputValidationError("invalid_type", "Expected text.", field);
  }
  const normalizedLineEndings = stripUnsafeControlChars(value).replace(/\r\n?/g, "\n");
  const singleOrMulti = options.multiline
    ? normalizedLineEndings
    : normalizedLineEndings.replace(/[\n\t]+/g, " ");
  const cleaned = options.multiline
    ? singleOrMulti
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    : singleOrMulti.replace(/\s+/g, " ").trim();
  if (options.required && !cleaned) {
    throw new InputValidationError("required", "This field is required.", field);
  }
  if (typeof options.maxLength === "number" && cleaned.length > options.maxLength) {
    throw new InputValidationError("too_long", `Must be ${options.maxLength} characters or fewer.`, field);
  }
  return cleaned || null;
}

export function asEmail(value: unknown, field: string, options: { required?: boolean } = {}): string | null {
  const raw = asText(value, field, { required: options.required, maxLength: 254 });
  if (!raw) return null;
  const email = raw.replace(/\s+/g, "").toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new InputValidationError("invalid_email", "Enter a valid email address.", field);
  }
  return email;
}

export function asUuid(value: unknown, field: string, options: { required?: boolean } = {}): string | null {
  const raw = asText(value, field, { required: options.required, maxLength: 64 });
  if (!raw) return null;
  if (!UUID_RE.test(raw)) {
    throw new InputValidationError("invalid_uuid", "Enter a valid identifier.", field);
  }
  return raw;
}

export function asIsoDate(value: unknown, field: string, options: { required?: boolean } = {}): string | null {
  const raw = asText(value, field, { required: options.required, maxLength: 10 });
  if (!raw) return null;
  if (!DATE_RE.test(raw) || Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime())) {
    throw new InputValidationError("invalid_date", "Enter a valid date.", field);
  }
  return raw;
}

export function asInteger(
  value: unknown,
  field: string,
  options: { required?: boolean; min?: number; max?: number } = {},
): number | null {
  if (value == null || value === "") {
    if (options.required) throw new InputValidationError("required", "This field is required.", field);
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^\d-]/g, ""));
  if (!Number.isInteger(parsed)) {
    throw new InputValidationError("invalid_number", "Enter a valid number.", field);
  }
  if (typeof options.min === "number" && parsed < options.min) {
    throw new InputValidationError("too_small", `Must be at least ${options.min}.`, field);
  }
  if (typeof options.max === "number" && parsed > options.max) {
    throw new InputValidationError("too_large", `Must be ${options.max} or less.`, field);
  }
  return parsed;
}

export function asMoney(
  value: unknown,
  field: string,
  options: { required?: boolean; min?: number; max?: number } = {},
): number | null {
  if (value == null || value === "") {
    if (options.required) throw new InputValidationError("required", "This field is required.", field);
    return null;
  }
  const parsed = typeof value === "number"
    ? value
    : Number(String(value).replace(/[^0-9.,-]/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new InputValidationError("invalid_money", "Enter a valid amount.", field);
  }
  if (typeof options.min === "number" && parsed < options.min) {
    throw new InputValidationError("too_small", `Must be at least ${options.min}.`, field);
  }
  if (typeof options.max === "number" && parsed > options.max) {
    throw new InputValidationError("too_large", `Must be ${options.max} or less.`, field);
  }
  return parsed;
}

export function normalizePhoneToE164(value: unknown, field = "phone", options: { required?: boolean } = {}): string | null {
  const raw = asText(value, field, { required: options.required, maxLength: 32 });
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    if (options.required) throw new InputValidationError("required", "This field is required.", field);
    return null;
  }
  if (raw.trim().startsWith("+")) {
    if (digits.length < 8 || digits.length > 15) {
      throw new InputValidationError("invalid_phone", "Enter a valid phone number.", field);
    }
    return `+${digits}`;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new InputValidationError("invalid_phone", "Enter a valid phone number.", field);
}

export function validationResponse(
  error: unknown,
  headers: HeadersInit,
): Response | null {
  if (!(error instanceof InputValidationError)) return null;
  return new Response(
    JSON.stringify({
      error: error.code,
      message: error.message,
      field: error.field,
    }),
    {
      status: error.status,
      headers: { ...headers, "Content-Type": "application/json" },
    },
  );
}
