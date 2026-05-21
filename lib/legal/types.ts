// Shared types for the legal documents (Terms, Privacy, Partner Agreement).
//
// These match the shape that `components/profile/LegalScreen.tsx` already
// renders — `Section[]` where each section has an optional heading and a
// list of paragraphs. Bullet lines inside paragraphs are rendered as plain
// text prefixed with "• "; no special parser needed.
//
// The web sister repo uses a similar `LegalSection[]` shape with a
// `parseLegalBody` helper; mobile keeps it simpler since RN has no native
// `<table>` and no markdown renderer in the bundle.

export type LegalSection = {
  /** Section heading, e.g. "1. Eligibility". Omit for intro callouts. */
  heading?: string;
  /**
   * Paragraphs in body order. Bullet items are formatted as
   * "• <text>" strings (one per array entry), so the LegalScreen
   * paragraph renderer can render them as-is without a parser.
   */
  paragraphs: string[];
};

/**
 * One row of the Sub-Processors table (Schedule A in both Privacy and
 * Partner Agreement). The 13 rows are identical between the two docs;
 * we keep a single source array in each content file for fidelity but
 * the shape is shared.
 */
export type SubProcessor = {
  name: string;
  service: string;
  region: string;
};

/**
 * One row of Restaurant Partner Agreement version history. Surfaced on
 * the standalone Agreement History screen.
 */
export type AgreementHistoryEntry = {
  version: string;
  effectiveDate: string;
  summary: string;
};
