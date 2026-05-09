import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import {
  ELEVENLABS_BASE,
  DEFAULT_VOICE_ID as SHARED_DEFAULT_VOICE_ID,
  ELEVENLABS_MODEL,
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_OUTPUT_FORMAT,
} from "../_shared/elevenlabs.ts";
import {
  getOpenAI,
  SMALL_PROMPT_MAX_TOKENS,
  SMALL_PROMPT_MODEL,
  SMALL_PROMPT_TEMPERATURE,
} from "../_shared/openai.ts";
import { checkAuth } from "../_shared/auth.ts";

const DEFAULT_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? SHARED_DEFAULT_VOICE_ID;
const TTS_OUTPUT_FORMAT = Deno.env.get("ELEVENLABS_OUTPUT_FORMAT") ?? DEFAULT_OUTPUT_FORMAT;

type Body = {
  transcript?: unknown;
  booking?: {
    restaurant_id?: unknown;
    restaurant_name?: unknown;
    party_size?: unknown;
    date?: unknown;
    time?: unknown;
  };
  voice_id?: unknown;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function nextMissing(booking: Body["booking"]): {
  next: "restaurant" | "party_size" | "date" | "time" | "confirmation";
  question: string;
} {
  const restaurantId = stringOrNull(booking?.restaurant_id);
  const restaurantName = stringOrNull(booking?.restaurant_name);
  const partySize = numberOrNull(booking?.party_size);
  const date = stringOrNull(booking?.date);
  const time = stringOrNull(booking?.time);

  if (!restaurantId && !restaurantName) {
    return { next: "restaurant", question: "What restaurant or area should I book?" };
  }
  if (partySize == null) return { next: "party_size", question: "How many guests?" };
  if (!date) return { next: "date", question: "What date should I book?" };
  if (!time) return { next: "time", question: "What time should I book?" };
  return { next: "confirmation", question: "Should I book it?" };
}

function buildSystemPrompt(question: string, booking: Body["booking"]) {
  return `You are Cenaiva, a fast restaurant table-booking assistant.
This is an off-topic/simple user message. Do not search restaurants, suggest cuisine, or mention examples.
Reply dynamically in exactly 2 short sentences, under 150 characters total.
Sentence 1: answer or react to the user's exact message briefly and naturally. If it asks about personal identity or self-judgment, say you cannot determine that for them.
Sentence 2: exactly "${question}"
Do not say "fair question." Do not ask for cuisine or vibe unless the user asked for food.
Known booking state: restaurant=${stringOrNull(booking?.restaurant_name) ?? stringOrNull(booking?.restaurant_id) ?? "missing"}; guests=${numberOrNull(booking?.party_size) ?? "missing"}; date=${stringOrNull(booking?.date) ?? "missing"}; time=${stringOrNull(booking?.time) ?? "missing"}.`;
}

function enforceQuestion(text: string, question: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return question;
  if (cleaned.endsWith(question)) return cleaned;
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const reaction = sentences[0]?.replace(/[.!?]*$/, ".") ?? "";
  const result = `${reaction ? `${reaction} ` : ""}${question}`;
  return result.length > 180 ? question : result;
}

function applyPronunciation(text: string): string {
  return text
    .replace(/\bCenaiva\b/gi, "sin eye vuh")
    .replace(/\bCENAIVA\b/g, "sin eye vuh");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function synthesizeSmallPromptAudio(text: string, voiceId: string) {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream?output_format=${TTS_OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: applyPronunciation(text),
          model_id: ELEVENLABS_MODEL,
          voice_settings: DEFAULT_VOICE_SETTINGS,
        }),
      },
    );
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) return null;
    return {
      audio_base64: arrayBufferToBase64(buffer),
      audio_content_type: response.headers.get("content-type") ?? "audio/mpeg",
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  // Assistant-only endpoint; reject anonymous callers.
  const auth = checkAuth(req);
  if (!auth.ok) {
    return jsonRes({ error: "Unauthorized", code: auth.reason }, 401);
  }

  try {
    const body = await req.json() as Body;
    const transcript = stringOrNull(body.transcript);
    if (!transcript) return jsonRes({ error: "transcript is required" }, 400);

    const missing = nextMissing(body.booking);
    const response = await getOpenAI().chat.completions.create({
      model: SMALL_PROMPT_MODEL,
      temperature: SMALL_PROMPT_TEMPERATURE,
      max_tokens: SMALL_PROMPT_MAX_TOKENS,
      messages: [
        { role: "system", content: buildSystemPrompt(missing.question, body.booking) },
        { role: "user", content: transcript },
      ],
    });

    const spokenText = enforceQuestion(
      response.choices[0]?.message?.content ?? "",
      missing.question,
    );
    const audio = await synthesizeSmallPromptAudio(
      spokenText,
      stringOrNull(body.voice_id) ?? DEFAULT_VOICE_ID,
    );
    return jsonRes({
      spoken_text: spokenText,
      next_expected_input: missing.next,
      audio,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("cenaiva-small-prompt error:", message);
    return jsonRes({ error: message || "small_prompt_failed" }, 500);
  }
});
