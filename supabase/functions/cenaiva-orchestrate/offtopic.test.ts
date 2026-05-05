import { mealPeriodForTimeZone } from "./offtopic.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("meal period helper returns a valid booking meal period", () => {
  const period = mealPeriodForTimeZone("America/Toronto");
  assert(
    period === "breakfast" || period === "lunch" || period === "dinner",
    "meal period should be one of the supported booking periods",
  );
});
