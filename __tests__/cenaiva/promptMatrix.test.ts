import type { AssistantResponseType } from '@cenaiva/assistant';
import {
  CENAIVA_QA_CATEGORY_ORDER,
  CENAIVA_QA_FORBIDDEN_TEXT,
  CENAIVA_QA_SCENARIOS,
  type CenaivaQaScenario,
} from '@/lib/cenaiva/qa/promptMatrix';
import { validateScenarioResponse } from '@/lib/cenaiva/qa/scenarioAssertions';

function response(patch: Partial<AssistantResponseType>): AssistantResponseType {
  return {
    conversation_id: 'conv-1',
    spoken_text: 'ok',
    intent: 'general_question' as AssistantResponseType['intent'],
    step: 'greeting' as AssistantResponseType['step'],
    next_expected_input: 'none' as AssistantResponseType['next_expected_input'],
    ui_actions: [],
    booking: null,
    map: null,
    filters: null,
    ...patch,
  };
}

function byId(id: string): CenaivaQaScenario {
  const match = CENAIVA_QA_SCENARIOS.find((scenario) => scenario.id === id);
  if (!match) throw new Error(`Missing scenario ${id}`);
  return match;
}

describe('Cenaiva QA prompt matrix', () => {
  it('covers the full customer scenario catalog with unique ids and prompts', () => {
    expect(CENAIVA_QA_SCENARIOS.length).toBeGreaterThanOrEqual(150);

    const ids = new Set(CENAIVA_QA_SCENARIOS.map((scenario) => scenario.id));
    const prompts = new Set(CENAIVA_QA_SCENARIOS.map((scenario) => scenario.prompt.toLowerCase()));
    expect(ids.size).toBe(CENAIVA_QA_SCENARIOS.length);
    expect(prompts.size).toBe(CENAIVA_QA_SCENARIOS.length);

    for (const scenario of CENAIVA_QA_SCENARIOS) {
      expect(scenario.id).toMatch(/^[a-z0-9-]+$/);
      expect(scenario.prompt.trim()).toBeTruthy();
      expect(scenario.expectedIntents.length).toBeGreaterThan(0);
      expect(scenario.expectedBehaviors.length).toBeGreaterThan(0);
      expect(scenario.forbiddenBehaviors).toContain('says_forbidden_fallback');
    }
  });

  it('has at least one prompt in every required category', () => {
    for (const category of CENAIVA_QA_CATEGORY_ORDER) {
      expect(CENAIVA_QA_SCENARIOS.some((scenario) => scenario.category === category)).toBe(true);
    }
  });

  it('locks down safety-sensitive categories', () => {
    const allergyScenarios = CENAIVA_QA_SCENARIOS.filter((scenario) => scenario.category === 'dietary_allergy');
    const accessibilityScenarios = CENAIVA_QA_SCENARIOS.filter((scenario) => scenario.category === 'accessibility');
    const prepayScenarios = CENAIVA_QA_SCENARIOS.filter((scenario) => scenario.category === 'prepay');

    expect(allergyScenarios.some((scenario) => scenario.requiredFields?.includes('allergy'))).toBe(true);
    expect(allergyScenarios.every((scenario) => scenario.forbiddenBehaviors.includes('guarantees_allergy_safety'))).toBe(true);
    expect(accessibilityScenarios.every((scenario) => scenario.forbiddenBehaviors.includes('guarantees_accessibility_without_data'))).toBe(true);
    expect(prepayScenarios.every((scenario) => scenario.expectedBehaviors.includes('open_checkout_without_charging'))).toBe(true);
    expect(prepayScenarios.every((scenario) => scenario.forbiddenBehaviors.includes('charges_without_payment_confirmation'))).toBe(true);
  });

  it('keeps the forbidden legacy fallback out of the approved copy set', () => {
    expect(CENAIVA_QA_FORBIDDEN_TEXT).toContain('Want me to look something else up?');
  });

  it('accepts a valid discovery response for a discovery prompt', () => {
    const findings = validateScenarioResponse(
      byId('restaurant-search-good-around-me'),
      response({
        intent: 'restaurant_search',
        ui_actions: [
          { type: 'show_map' },
          { type: 'show_restaurant_cards', restaurant_ids: ['r1', 'r2'] },
        ],
        map: { visible: true, marker_restaurant_ids: ['r1', 'r2'] },
      }),
    );

    expect(findings).toEqual([]);
  });

  it('rejects broad discovery responses that loop back to a cuisine question', () => {
    const findings = validateScenarioResponse(
      byId('restaurant-search-food-nearby'),
      response({
        intent: 'restaurant_search',
        spoken_text: 'What kind of restaurant are you looking for?',
        ui_actions: [],
      }),
    );

    expect(findings.map((finding) => finding.code)).toContain('forbidden_text');
    expect(findings.map((finding) => finding.code)).toContain('missing_ui_action');
  });

  it('rejects reservation creation before final confirmation', () => {
    const findings = validateScenarioResponse(
      byId('reservation-create-table-for-two-tonight'),
      response({
        intent: 'reservation_create',
        ui_actions: [{ type: 'show_confirmation', confirmation_code: 'ABC123' }],
        booking: { reservation_id: 'res-1', status: 'confirmed' },
      }),
    );

    expect(findings.map((finding) => finding.code)).toContain('created_reservation_too_early');
  });

  it('rejects unsafe allergy and prepay responses', () => {
    expect(
      validateScenarioResponse(
        byId('allergy-nut'),
        response({
          intent: 'restaurant_search',
          spoken_text: 'This restaurant is guaranteed safe for nut allergies.',
        }),
      ).map((finding) => finding.code),
    ).toContain('unsafe_allergy_copy');

    expect(
      validateScenarioResponse(
        byId('prepay-pay-now'),
        response({
          intent: 'payment_question',
          ui_actions: [{ type: 'show_payment_success', amount_charged: 42 }],
          booking: { payment_status: 'paid', status: 'paid' },
        }),
      ).map((finding) => finding.code),
    ).toContain('payment_without_confirmation');
  });
});
