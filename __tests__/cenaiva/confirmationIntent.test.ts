import {
  isCenaivaAffirmativeBookingConfirmation,
  isCenaivaBookingConfirmationReply,
  isCenaivaNegativeBookingConfirmation,
  shouldRouteAsCenaivaBookingConfirmation,
  transcriptForCenaivaBookingConfirmation,
} from '@/lib/cenaiva/confirmationIntent';
import { isCenaivaProcessPrompt } from '@/lib/cenaiva/simplePromptIntent';

describe('Cenaiva booking confirmation intent', () => {
  it('recognizes short affirmative replies that should confirm a pending booking', () => {
    expect(isCenaivaAffirmativeBookingConfirmation('yes')).toBe(true);
    expect(isCenaivaAffirmativeBookingConfirmation('yeah')).toBe(true);
    expect(isCenaivaAffirmativeBookingConfirmation('go ahead')).toBe(true);
    expect(isCenaivaAffirmativeBookingConfirmation('book it')).toBe(true);
    expect(isCenaivaBookingConfirmationReply('yes please')).toBe(true);
  });

  it('recognizes negative or change replies during final confirmation', () => {
    expect(isCenaivaNegativeBookingConfirmation('no')).toBe(true);
    expect(isCenaivaNegativeBookingConfirmation('not yet')).toBe(true);
    expect(isCenaivaNegativeBookingConfirmation('change it')).toBe(true);
    expect(isCenaivaBookingConfirmationReply('hold on')).toBe(true);
  });

  it('keeps a bare yes out of the general process classifier', () => {
    expect(isCenaivaProcessPrompt('yes')).toBe(false);
    expect(isCenaivaProcessPrompt('yes, confirm booking')).toBe(true);
  });

  it('only upgrades short confirmation replies while booking is confirming', () => {
    expect(shouldRouteAsCenaivaBookingConfirmation('confirming', 'yes')).toBe(true);
    expect(shouldRouteAsCenaivaBookingConfirmation('collecting_minimum_fields', 'yes')).toBe(false);
    expect(transcriptForCenaivaBookingConfirmation('confirming', 'yes')).toBe('yes, confirm booking');
    expect(transcriptForCenaivaBookingConfirmation('confirming', 'no')).toBe('no');
    expect(transcriptForCenaivaBookingConfirmation('idle', 'yes')).toBe('yes');
  });
});
