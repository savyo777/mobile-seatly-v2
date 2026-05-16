// @ts-nocheck
// Estimated paid API budget guard for Hey Cenaiva.
//
// This is intentionally separate from request rate limits: rate limits stop
// burst abuse, while this guard caps the estimated daily vendor spend per user
// and for the platform as a whole.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

function envNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw ? Number.parseFloat(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const PAID_USAGE_BUDGETS = {
  userDailyUsd: envNumber("CENAIVA_USER_DAILY_AI_BUDGET_USD", 0.5),
  platformDailyUsd: envNumber("CENAIVA_PLATFORM_DAILY_AI_BUDGET_USD", 5000),
  costs: {
    orchestrate: envNumber("CENAIVA_COST_ORCHESTRATE_USD", 0.001),
    smallPrompt: envNumber("CENAIVA_COST_SMALL_PROMPT_USD", 0.018),
    elevenlabsTts: envNumber("CENAIVA_COST_ELEVENLABS_TTS_USD", 0.025),
    deepgramToken: envNumber("CENAIVA_COST_DEEPGRAM_TOKEN_USD", 0.003),
  },
};

export class PaidUsageBudgetError extends Error {
  reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "PaidUsageBudgetError";
    this.reason = reason;
  }
}

export function paidUsageIdentifier(userId?: string | null): string | null {
  if (!userId) return null;
  return `user:${userId}`;
}

export async function enforcePaidUsageBudget(
  client: SupabaseClient,
  params: {
    userKey: string | null;
    service: string;
    estimatedCostUsd: number;
    userDailyBudgetUsd?: number;
    platformDailyBudgetUsd?: number;
  },
): Promise<void> {
  if (!params.userKey) {
    throw new PaidUsageBudgetError("missing_user");
  }

  const { data, error } = await client.rpc("check_paid_usage_budget", {
    p_user_key: params.userKey,
    p_service: params.service,
    p_estimated_cost_usd: params.estimatedCostUsd,
    p_user_daily_budget_usd: params.userDailyBudgetUsd ?? PAID_USAGE_BUDGETS.userDailyUsd,
    p_platform_daily_budget_usd: params.platformDailyBudgetUsd ?? PAID_USAGE_BUDGETS.platformDailyUsd,
  });

  if (error) {
    throw new PaidUsageBudgetError("budget_unavailable");
  }

  const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
  if (result.allowed !== true) {
    throw new PaidUsageBudgetError(
      typeof result.reason === "string" && result.reason ? result.reason : "budget_exceeded",
    );
  }
}
