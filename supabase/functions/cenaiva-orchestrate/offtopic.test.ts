import {
  knownGeneralOffTopicIntent,
  playfulPersonalOffTopicIntent,
  scopedOffTopicFallback,
  scopedWarmBoundaryFallback,
} from "./offtopic.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("playful personal remarks use a warm off-topic boundary", () => {
  assert(
    playfulPersonalOffTopicIntent("you're cute"),
    "direct compliment should be off-topic",
  );
  assert(
    playfulPersonalOffTopicIntent("Cenaiva, I love you"),
    "playful personal remark should be off-topic",
  );
  assert(
    playfulPersonalOffTopicIntent("youre cute"),
    "apostrophe-less STT compliment should be off-topic",
  );
  assert(
    scopedWarmBoundaryFallback() ===
      "I'm flattered, but my mission is to provide you a perfect dining experience. What can I do for you?",
    "warm boundary copy should stay stable",
  );
});

Deno.test("dining uses of cute still allow restaurant discovery", () => {
  assert(
    !playfulPersonalOffTopicIntent("show me a cute date spot"),
    "cute date spots should stay in scope",
  );
  assert(
    !playfulPersonalOffTopicIntent("find a cute restaurant near me"),
    "cute restaurants should stay in scope",
  );
});

Deno.test("general off-topic prompts acknowledge and redirect without restaurant discovery", () => {
  assert(
    knownGeneralOffTopicIntent("what is the weather today"),
    "weather should be off-topic",
  );
  assert(
    knownGeneralOffTopicIntent("debug my code"),
    "coding help should be off-topic",
  );
  assert(
    !knownGeneralOffTopicIntent("find restaurants near my hotel"),
    "restaurant discovery near a hotel should stay in scope",
  );
  assert(
    !knownGeneralOffTopicIntent("does this restaurant show the game"),
    "restaurant-specific event questions should stay in scope",
  );
  const fallback = scopedOffTopicFallback("America/Toronto");
  assert(
    fallback.startsWith(
      "I hear you, but my mission is to make sure you find the perfect ",
    ),
    "generic off-topic copy should acknowledge the user",
  );
  assert(
    fallback.endsWith(" for you. What can I help with?"),
    "generic off-topic copy should redirect to Cenaiva's dining mission",
  );
});
