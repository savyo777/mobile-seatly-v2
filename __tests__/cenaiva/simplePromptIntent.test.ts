import {
  getCenaivaImmediateFiller,
  isCenaivaProcessPrompt,
  shouldResetCenaivaBookingContext,
} from '@/lib/cenaiva/simplePromptIntent';

describe('Cenaiva simple prompt intent', () => {
  it('does not provide local canned small-prompt answers', () => {
    expect(isCenaivaProcessPrompt('What time is it?')).toBe(false);
    expect(isCenaivaProcessPrompt("You're cute")).toBe(false);
    expect(isCenaivaProcessPrompt('Am I gay?')).toBe(false);
    expect(isCenaivaProcessPrompt('Can you do my homework first?')).toBe(false);
  });

  it('keeps dining discovery prompts on the orchestrator process path', () => {
    expect(isCenaivaProcessPrompt('Find European foods nearby')).toBe(true);
    expect(isCenaivaProcessPrompt('I want Italian.')).toBe(true);
    expect(isCenaivaProcessPrompt('Something with sushi.')).toBe(true);
    expect(isCenaivaProcessPrompt('Can I bring a dog?')).toBe(true);
    expect(isCenaivaProcessPrompt('Table for 2.')).toBe(true);
  });

  it('uses short generic filler copy only for complex process prompts', () => {
    expect(getCenaivaImmediateFiller('Book a table for two tonight')).toBe('One moment please.');
    expect(getCenaivaImmediateFiller('What times are available?')).toBe('One moment please.');
    expect(getCenaivaImmediateFiller('Show me the menu')).toBe('One moment please.');
    expect(getCenaivaImmediateFiller('Find Italian restaurants near me.')).toBe('One moment please.');
  });

  it('does not emit filler for off-topic or personal small prompts', () => {
    expect(getCenaivaImmediateFiller('What time is it?')).toBeNull();
    expect(getCenaivaImmediateFiller("You're cute")).toBeNull();
    expect(getCenaivaImmediateFiller('Am I gay?')).toBeNull();
    expect(getCenaivaImmediateFiller('Do you think fish get thirsty?')).toBeNull();
    expect(getCenaivaImmediateFiller('Can you order me a car?')).toBeNull();
    expect(getCenaivaImmediateFiller('this is fucking useless')).toBeNull();
  });

  it('does not block real dining requests that contain profanity', () => {
    expect(isCenaivaProcessPrompt('Find me fucking Italian food nearby')).toBe(true);
    expect(getCenaivaImmediateFiller('Find me fucking Italian food nearby')).toBe('One moment please.');
  });

  it('resets stale restaurant context for explicit resets and new discovery searches', () => {
    expect(shouldResetCenaivaBookingContext('Start over.')).toBe(true);
    expect(shouldResetCenaivaBookingContext('I want Italian food nearby.')).toBe(true);
    expect(shouldResetCenaivaBookingContext('Switch to sushi instead.')).toBe(true);
    expect(shouldResetCenaivaBookingContext('I want to preorder.')).toBe(false);
    expect(shouldResetCenaivaBookingContext('For two people.')).toBe(false);
    expect(shouldResetCenaivaBookingContext('Am I gay?')).toBe(false);
  });
});
