import {
  InputValidationError,
  asEmail,
  asInteger,
  asIsoDate,
  asMoney,
  asText,
  normalizePhoneToE164,
  readJsonObject,
} from "./input-validation.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

type ErrorClass = { new (...args: never[]): Error; name: string };

function assertThrows(fn: () => unknown, expectedError: ErrorClass) {
  try {
    fn();
  } catch (error) {
    if (error instanceof expectedError) return;
    throw new Error(`Expected ${expectedError.name}, received ${(error as Error)?.name ?? typeof error}`);
  }
  throw new Error(`Expected ${expectedError.name} to be thrown`);
}

async function assertRejects(fn: () => Promise<unknown>, expectedError: ErrorClass, messageIncludes?: string) {
  try {
    await fn();
  } catch (error) {
    if (!(error instanceof expectedError)) {
      throw new Error(`Expected ${expectedError.name}, received ${(error as Error)?.name ?? typeof error}`);
    }
    if (messageIncludes && !String((error as Error).message).includes(messageIncludes)) {
      throw new Error(`Expected error message to include ${messageIncludes}`);
    }
    return;
  }
  throw new Error(`Expected ${expectedError.name} to be rejected`);
}

Deno.test("readJsonObject rejects invalid JSON", async () => {
  const req = new Request("http://localhost", {
    method: "POST",
    body: "{not-json",
  });
  await assertRejects(() => readJsonObject(req), InputValidationError, "valid JSON");
});

Deno.test("asText preserves normal multiline text and strips controls", () => {
  assertEquals(
    asText(" hello\u0000\n\n\nworld ", "notes", { multiline: true }),
    "hello\n\nworld",
  );
});

Deno.test("structured validators normalize valid values", () => {
  assertEquals(asEmail(" USER@Example.COM ", "email"), "user@example.com");
  assertEquals(normalizePhoneToE164("(416) 555-1234"), "+14165551234");
  assertEquals(asInteger("12 people", "party", { min: 1, max: 20 }), 12);
  assertEquals(asMoney("$12,34", "amount"), 12.34);
  assertEquals(asIsoDate("2026-05-15", "date"), "2026-05-15");
});

Deno.test("structured validators reject malformed values", () => {
  assertThrows(() => asEmail("bad", "email"), InputValidationError);
  assertThrows(() => normalizePhoneToE164("123"), InputValidationError);
  assertThrows(() => asInteger("100", "party", { max: 20 }), InputValidationError);
  assertThrows(() => asIsoDate("05/15/2026", "date"), InputValidationError);
});
