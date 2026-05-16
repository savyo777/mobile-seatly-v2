// @ts-nocheck
import { corsHeaders } from "./cors.ts";

export function jsonRes(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(extraHeaders ?? {}),
    },
  });
}
