import { resolveRestaurantHoursForDate } from "./hours.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test("resolveRestaurantHoursForDate reads abbreviated weekday keys", () => {
  const result = resolveRestaurantHoursForDate(
    {
      wed: {
        open: "11:30",
        close: "22:00",
      },
    },
    "2026-05-06",
    3,
  );

  assertEquals(result.closed, false);
  assertEquals(result.window?.open, 690);
  assertEquals(result.window?.close, 1320);
});

Deno.test("resolveRestaurantHoursForDate keeps explicit full-day closures authoritative", () => {
  const result = resolveRestaurantHoursForDate(
    {
      wednesday: null,
      wed: {
        open: "11:30",
        close: "22:00",
      },
    },
    "2026-05-06",
    3,
  );

  assertEquals(result.closed, true);
  assertEquals(result.window, null);
});
