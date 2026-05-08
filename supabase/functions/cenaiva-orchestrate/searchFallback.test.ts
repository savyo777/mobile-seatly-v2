import {
  buildNoZeroResultFallbackSpokenText,
  buildZeroResultFallbackSpokenText,
  chooseZeroResultFallbackRows,
  type SearchFallbackRestaurant,
} from "./searchFallback.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, label: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(
    actualJson === expectedJson,
    `${label}\nexpected: ${expectedJson}\nactual:   ${actualJson}`,
  );
}

const rows: SearchFallbackRestaurant[] = [
  {
    id: "toronto-italian",
    name: "Bar Toronto",
    cuisine_type: "Italian",
    city: "Toronto",
    avg_rating: 4.8,
    price_range: 2,
  },
  {
    id: "montreal-lebanese",
    name: "Beirut Montreal",
    cuisine_type: "Lebanese",
    city: "Montreal",
    avg_rating: 5,
    price_range: 2,
  },
  {
    id: "toronto-lebanese",
    name: "Levant Toronto",
    cuisine_type: "Lebanese",
    city: "Toronto",
    avg_rating: 4.4,
    price_range: 3,
  },
];

Deno.test("zero-result fallback keeps the requested city before same-cuisine restaurants elsewhere", () => {
  const result = chooseZeroResultFallbackRows({
    rows,
    transcript: "middle eastern in Toronto",
    requestedCity: "Toronto",
    cuisineTerms: ["middle eastern", "lebanese", "turkish", "halal"],
    priceRangeMax: 2,
  });

  assertEquals(
    result.map((row) => row.id),
    ["toronto-lebanese"],
    "same city fallback",
  );
});

Deno.test("zero-result fallback returns no fake marker when the requested city has no active restaurants", () => {
  const result = chooseZeroResultFallbackRows({
    rows,
    transcript: "middle eastern in Ottawa",
    requestedCity: "Ottawa",
    cuisineTerms: ["middle eastern", "lebanese"],
  });

  assertEquals(result, [], "no same-city fallback");
});

Deno.test("zero-result fallback uses the detected user city when the user did not name a city", () => {
  const result = chooseZeroResultFallbackRows({
    rows,
    transcript: "show me middle eastern restaurants",
    userCity: "Toronto",
    cuisineTerms: ["middle eastern", "lebanese"],
  });

  assertEquals(
    result.map((row) => row.id),
    ["toronto-lebanese"],
    "user-city fallback",
  );
});

Deno.test("zero-result fallback handles city names with region suffixes", () => {
  const result = chooseZeroResultFallbackRows({
    rows: [
      {
        id: "toronto-on",
        name: "Toronto Bistro",
        cuisine_type: "Canadian",
        city: "Toronto, ON",
        avg_rating: 4.7,
      },
    ],
    transcript: "middle eastern in Toronto",
    requestedCity: "Toronto",
    cuisineTerms: ["middle eastern"],
  });

  assertEquals(
    result.map((row) => row.id),
    ["toronto-on"],
    "regional city suffix",
  );
});

Deno.test("zero-result fallback speech names the missing exact search and fallback", () => {
  assertEquals(
    buildZeroResultFallbackSpokenText({
      cuisine: "middle eastern",
      city: "toronto",
      fallbackName: "Levant Toronto",
    }),
    "I don't see Middle Eastern restaurants in Toronto matching that. I'd recommend Levant Toronto instead.",
    "fallback spoken text",
  );
});

Deno.test("zero-result no-fallback speech asks for a different cuisine or area", () => {
  assertEquals(
    buildNoZeroResultFallbackSpokenText({
      cuisine: "middle eastern",
      city: "ottawa",
    }),
    "I don't see Middle Eastern restaurants in Ottawa matching that. Try a different cuisine or area.",
    "no fallback spoken text",
  );
});
