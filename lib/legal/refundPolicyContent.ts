// Cenaiva Refund Policy — diner-facing summary of how deposits, fees, and
// refunds work. Verbatim port of the web source of truth
// (apps/web/src/pages/legal/RefundPolicyPage.tsx), in mobile's LegalSection
// shape. The authoritative legal text is Terms §11.3; this is the plain-language
// companion linked as cenaiva.com/refund-policy.

import type { LegalSection } from './types';
import { TERMS_EFFECTIVE_DATE, TERMS_LAST_UPDATED } from './versions';

export { TERMS_EFFECTIVE_DATE, TERMS_LAST_UPDATED };

export const REFUND_POLICY_INTRO =
  'This page explains how Cenaiva handles deposits, fees, and refunds. For the full legal text, see Section 11.3 of the Terms of Service.';

export const REFUND_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: '1. What you pay',
    paragraphs: [
      'Every checkout breaks down into three line items so you see exactly where your money goes before you pay. There are no hidden fees added after confirmation.',
      '• Deposit / order base — $20.00',
      '• Platform fee (2%) — $0.40',
      '• Processing fee — $0.93',
      '• Total charged — $21.33',
      '• Refund (if eligible) — $20.00',
      'Worked example on a $20 deposit. Exact totals scale linearly with your base amount.',
    ],
  },
  {
    heading: '2. What gets refunded',
    paragraphs: [
      "The deposit (or order base) is fully refundable when you cancel before you're seated, when the restaurant marks you seated, or when the restaurant cancels on you.",
      'Platform and processing fees are non-refundable — both are disclosed before you pay, in exchange for full transparency on the deposit side.',
    ],
  },
  {
    heading: '3. When you get refunded',
    paragraphs: [
      'Full refund of base:',
      '• The restaurant marks you seated on arrival',
      "• You cancel before you're seated (or before the reservation reaches a final status)",
      '• A staff member undoes a "Mark Arrived" within the grace window',
      '• Our auto-cron releases the deposit after the grace window elapses without a no-show flag',
      'Deposit forfeited:',
      '• No-show — the restaurant flags you as a no-show and the grace window has elapsed',
      'Reach out to the restaurant directly if you believe a no-show flag was applied in error.',
    ],
  },
  {
    heading: '4. Timing',
    paragraphs: [
      'Refunds typically land on your card within 5–10 business days from when the refund is initiated. The exact timing depends on your card issuer.',
    ],
  },
  {
    heading: '5. How to request a refund',
    paragraphs: [
      'The fastest path is to find your reservation and cancel it directly. If you booked as a guest (without an account), use your confirmation code and email on the find-reservation page.',
    ],
  },
  {
    heading: '6. Disputes',
    paragraphs: [
      'If something looks wrong on your statement, contact help@cenaiva.com within 5 business days of the charge. We investigate per Terms §11.3 and aim to resolve duplicate charges or verified failed transactions within 5 business days. Please contact us before initiating a chargeback — see Terms §11.6.',
    ],
  },
];
