// @ts-nocheck
// Shared OpenAI client + tunables. Previously cenaiva-orchestrate and
// cenaiva-small-prompt each instantiated their own OpenAI client and read
// the env separately, which led to drift on model names and pre-warm
// behavior. Importing from here is the single source of truth.

import OpenAI from "npm:openai@4";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
export const ORCHESTRATOR_MODEL =
  Deno.env.get("CENAIVA_ORCHESTRATOR_MODEL")?.trim() || "gpt-4o-mini";
export const SMALL_PROMPT_MODEL =
  Deno.env.get("CENAIVA_SMALL_PROMPT_MODEL")?.trim() || "gpt-4.1-nano";

// Sensible defaults; individual callers can override per-request.
export const SMALL_PROMPT_TEMPERATURE = 0.1;
export const SMALL_PROMPT_MAX_TOKENS = 45;

// Construction is lazy via getOpenAI() because Deno cold-starts in some
// environments fail when the OpenAI module is imported with no key set.
let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!cached) {
    cached = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  }
  return cached;
}

/**
 * Optional pre-warm. Caller decides when (typically gated on
 * CENAIVA_OPENAI_PREWARM=1) — we don't run it at module load because
 * cold-start network work can compete with the first live request.
 */
export async function prewarmOpenAI(): Promise<void> {
  try {
    await getOpenAI().models.list();
  } catch {
    // best-effort
  }
}

// Default model for vision calls. gpt-4o-mini supports image inputs and
// is what the orchestrator already uses, so no new model dependency.
export const VISION_MODEL =
  Deno.env.get("CENAIVA_VISION_MODEL")?.trim() || ORCHESTRATOR_MODEL;

export interface VisionCallParams {
  imageBase64: string;
  imageMimeType?: string;
  systemPrompt: string;
  userPrompt?: string;
  jsonSchema: {
    name: string;
    schema: Record<string, unknown>;
  };
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface VisionCallResult<T> {
  parsed: T;
  raw: unknown;
}

/**
 * Vision-LLM call returning a JSON object that conforms to the supplied
 * schema. The model is forced into structured output via `response_format:
 * json_schema` with strict=true, so the response is guaranteed to parse.
 *
 * Used by the scan-receipt edge function. Add new vision callers here
 * rather than reinventing the wheel.
 */
export async function callOpenAIVision<T>({
  imageBase64,
  imageMimeType = "image/jpeg",
  systemPrompt,
  userPrompt = "Extract the structured data from this image.",
  jsonSchema,
  model = VISION_MODEL,
  temperature = 0,
  maxTokens = 800,
}: VisionCallParams): Promise<VisionCallResult<T>> {
  const dataUrl = `data:${imageMimeType};base64,${imageBase64}`;

  const completion = await getOpenAI().chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: jsonSchema.name,
        strict: true,
        schema: jsonSchema.schema,
      },
    },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content ?? "";
  let parsed: T;
  try {
    parsed = JSON.parse(content) as T;
  } catch (err) {
    throw new Error(
      `callOpenAIVision: model returned non-JSON content: ${content.slice(0, 200)}`,
    );
  }

  return { parsed, raw: completion };
}
