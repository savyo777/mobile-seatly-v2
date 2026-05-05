import type {
  AssistantResponseType,
  BookingState,
  UIActionType,
} from '@cenaiva/assistant';
import { isCenaivaProcessPrompt } from '@/lib/cenaiva/simplePromptIntent';

type AvailabilityMode =
  | 'exact'
  | 'any_day_at_time'
  | 'weekday_any_time'
  | 'date_any_time'
  | 'first_available';

export type CenaivaAvailabilityRequest = {
  restaurant_id: string;
  restaurant_name?: string | null;
  party_size: number;
  mode: AvailabilityMode;
  date?: string | null;
  time?: string | null;
  weekday?: number | null;
  timezone?: string | null;
  search_days?: number;
  nearest_count?: number;
  split_at?: string;
};

export type CenaivaAvailabilityOption = {
  shift_id: string;
  shift_name?: string;
  date_time: string;
  display_time: string;
  date: string;
  diff_minutes?: number;
};

export type CenaivaAvailabilityResponse = {
  status: 'available' | 'unavailable' | 'options' | 'needs_more_info';
  requested?: {
    date?: string | null;
    time?: string | null;
    weekday?: number | null;
  };
  selected_slot?: CenaivaAvailabilityOption | null;
  alternatives?: CenaivaAvailabilityOption[];
  message?: string;
};

export type LocalBookingDecision =
  | { kind: 'pass' }
  | {
      kind: 'local_response';
      response: AssistantResponseType;
      clearPendingOptions?: boolean;
    }
  | {
      kind: 'check_availability';
      request: CenaivaAvailabilityRequest;
      filler: string;
      responseBeforeCheck: AssistantResponseType;
    };

type LocalBookingContext = {
  transcript: string;
  booking: BookingState;
  conversationId: string | null;
  selectedRestaurantId?: string | null;
  selectedRestaurantName?: string | null;
  timezone?: string | null;
  pendingOptions?: CenaivaAvailabilityOption[];
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  one: 1,
  won: 1,
  two: 2,
  too: 2,
  to: 2,
  couple: 2,
  pair: 2,
  three: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  ate: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const TIME_WORDS: Record<string, number> = {
  midnight: 0,
  noon: 12,
  twelve: 12,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
};

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const PREORDER_PAYMENT_OR_POLICY_PATTERN =
  /\b(menu|pre[- ]?order|order food|checkout|pay|payment|card|deposit|refund|fee|tax|tip|directions?|address|phone|contact|hours?|parking|dress code|bring (?:a )?(?:dog|pet)|kids allowed|allow kids|wheelchair|accessible|accessibility|halal|gluten[- ]free|allerg(?:y|ies)|birthday cake|split bills?|no[- ]shows?|cancel reservation|change the booking later|modify reservation)\b/i;

const DISCOVERY_PATTERN =
  /\b(find|show|search|recommend|suggest|pick|choose|closest|nearest|near me|nearby|near|around me|restaurants?|places?|spots?|cuisine|italian|french|european|europeean|europian|japanese|sushi|thai|spanish|greek|mediterranean|steakhouse|egyptian|asian|halal|vegan|burgers?|mocktails?|cocktails?|vegetarian|seafood|steak|healthy|spicy|dessert|downtown|something nice|surprise me|you choose|cheaper|fancier|closer|different restaurant|switch to)\b/i;

const BACKEND_STATUSES = new Set<BookingState['status']>([
  'confirmed',
  'post_booking',
  'offering_preorder',
  'browsing_menu',
  'reviewing_cart',
  'choosing_tip_timing',
  'choosing_tip_amount',
  'choosing_payment_split',
  'collecting_payment',
  'charging',
  'paid',
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberTokenToInt(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+$/.test(token)) {
    const n = parseInt(token, 10);
    return n >= 1 && n <= 20 ? n : null;
  }
  return NUMBER_WORDS[token] ?? null;
}

export function parseLocalPartySize(raw: string): number | null {
  const t = normalize(raw);
  if (/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:or|to|-)\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/.test(t)) {
    return null;
  }
  const adultsKids = t.match(
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+adults?\b[\s\S]{0,30}\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:kids?|children)\b/,
  );
  if (adultsKids) {
    const adults = numberTokenToInt(adultsKids[1]);
    const kids = numberTokenToInt(adultsKids[2]);
    if (adults != null && kids != null) return adults + kids;
  }
  const kidsAdults = t.match(
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:kids?|children)\b[\s\S]{0,30}\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+adults?\b/,
  );
  if (kidsAdults) {
    const kids = numberTokenToInt(kidsAdults[1]);
    const adults = numberTokenToInt(kidsAdults[2]);
    if (adults != null && kids != null) return adults + kids;
  }
  if (/\b(just me|solo|alone|by myself)\b/.test(t)) return 1;
  if (/\b(me plus one|me and (?:my )?(?:wife|husband|partner|boyfriend|girlfriend|date|friend))\b/.test(t)) {
    return 2;
  }
  if (/\b(double date)\b/.test(t)) return 4;

  const explicit = t.match(
    /\b(?:party of|table for|for|group of|we are|we're|make it|book for|reservation for)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|couple|pair)\b/,
  );
  if (explicit) {
    const n = numberTokenToInt(explicit[1]);
    if (n != null) return n;
  }

  const people = t.match(
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:people|guests|guest|adults|pax|persons?|of us)\b/,
  );
  if (people) {
    const n = numberTokenToInt(people[1]);
    if (n != null) return n;
  }

  const bare = t.match(/^(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)$/);
  if (bare) return numberTokenToInt(bare[1]);
  return null;
}

function formatISODateInTimeZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function addDaysToISODate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function localDayOfWeek(dateStr: string, timezone: string): number {
  const localDow = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(new Date(`${dateStr}T12:00:00Z`)).toLowerCase();
  return WEEKDAYS.indexOf(localDow);
}

export function parseLocalDate(raw: string, timezone = 'America/Toronto'): string | null {
  const t = normalize(raw);
  const todayIso = formatISODateInTimeZone(new Date(), timezone);
  if (/\b(today|tonight|this evening)\b/.test(t)) return todayIso;
  if (/\btomorrow\b/.test(t)) return addDaysToISODate(todayIso, 1);

  const iso = t.match(/\b(\d{4})\s+(\d{2})\s+(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const monthDay = t.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  );
  if (monthDay) {
    const month = MONTHS[monthDay[1]];
    const day = parseInt(monthDay[2], 10);
    if (month && day >= 1 && day <= 31) {
      const currentYear = parseInt(todayIso.slice(0, 4), 10);
      let candidate = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (candidate < todayIso) {
        candidate = `${currentYear + 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return candidate;
    }
  }

  const todayDow = localDayOfWeek(todayIso, timezone);
  for (let i = 0; i < WEEKDAYS.length; i += 1) {
    const re = new RegExp(`\\b(?:this|next|on)?\\s*${WEEKDAYS[i]}\\b`);
    if (!re.test(t)) continue;
    const diff = (i - todayDow + 7) % 7 || 7;
    return addDaysToISODate(todayIso, diff);
  }

  return null;
}

export function parseLocalWeekday(raw: string): number | null {
  const t = normalize(raw);
  for (let i = 0; i < WEEKDAYS.length; i += 1) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(t)) return i;
  }
  if (/\bnext weekend\b/.test(t)) return 6;
  return null;
}

export function parseLocalTime(raw: string, opts: { allowBareTime?: boolean } = {}): string | null {
  const t = normalize(raw)
    .replace(/\b(uh+|um+|er+|ah+|hmm+|please|pls|thanks|thank you|actually|maybe|i think|okay|ok|yeah|yep|yes|sure|alright)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const ampm = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a m|p m)\b/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const min = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const period = ampm[3].replace(/\s/g, '');
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && min >= 0 && min < 60) {
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }

  const colon = t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colon) {
    let h = parseInt(colon[1], 10);
    const min = parseInt(colon[2], 10);
    if (h >= 1 && h <= 10) h += 12;
    if (h >= 0 && h <= 23 && min >= 0 && min < 60) {
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }

  const word =
    t.match(
      /\b(?:at|around|about|after|before|by|maybe|like|how about)\s+(midnight|noon|twelve|one|two|three|four|five|six|seven|eight|nine|ten|eleven)\s*(thirty|fifteen|forty five|am|pm)?\s*(am|pm)?\b(?!\s+(?:people|guests|guest|of us|adults|kids|children))/,
    ) ??
    (opts.allowBareTime
      ? t.match(
        /^(midnight|noon|twelve|one|two|three|four|five|six|seven|eight|nine|ten|eleven)\s*(thirty|fifteen|forty five|am|pm)?\s*(am|pm)?$/,
      )
      : null);
  if (word) {
    const base = TIME_WORDS[word[1]];
    if (base != null) {
      let h = base;
      let min = 0;
      const modifier = word[2];
      let period = word[3] ?? null;
      if (modifier === 'thirty') min = 30;
      else if (modifier === 'fifteen') min = 15;
      else if (modifier === 'forty five') min = 45;
      else if (modifier === 'am' || modifier === 'pm') period = modifier;
      if (period === 'pm' && h < 12) h += 12;
      if (period === 'am' && h === 12) h = 0;
      if (!period && h >= 1 && h <= 10) h += 12;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }

  const contextualBare = t.match(
    /\b(?:at|around|about|for|after|before|by|tonight|tomorrow|friday|saturday|sunday|monday|tuesday|wednesday|thursday)\s+(\d{1,2})(?:ish)?\b(?!\s*(?:people|guests|of us))/,
  );
  if (contextualBare) {
    let h = parseInt(contextualBare[1], 10);
    if (h >= 1 && h <= 10) h += 12;
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
  }

  if (opts.allowBareTime) {
    const bare = t.match(/^(\d{1,2})(?:ish)?$/);
    if (bare) {
      let h = parseInt(bare[1], 10);
      if (h >= 1 && h <= 10) h += 12;
      if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`;
    }
  }

  return null;
}

function parseSpecialRequest(raw: string): string | null {
  const t = normalize(raw);
  const requests: string[] = [];
  if (/\boutdoor|patio\b/.test(t)) requests.push('outdoor seating if available');
  if (/\bindoor|inside\b/.test(t)) requests.push('indoor seating');
  if (/\bbooth\b/.test(t)) requests.push('booth if available');
  if (/\bquiet|private|calm\b/.test(t)) requests.push('quieter seating if available');
  if (/\bhigh chair\b/.test(t)) requests.push('high chair if available');
  if (/\bwindow\b/.test(t)) requests.push('window table if available');
  return requests.length ? requests.join(', ') : null;
}

function isAffirmative(raw: string): boolean {
  const t = normalize(raw);
  return /^(yes|yeah|yep|yup|sure|ok|okay|alright|sounds good|go ahead|book it|confirm|confirmed|do it|lock it in|please do)$/.test(t) ||
    /\b(yes|confirm|book it|go ahead|lock it in|make the reservation)\b/.test(t);
}

function wantsBackendDiscovery(raw: string, hasRestaurant: boolean): boolean {
  const t = normalize(raw);
  if (!DISCOVERY_PATTERN.test(t)) return false;
  if (!hasRestaurant) return true;
  return /\b(different|switch|instead|closer|cheaper|fancier|another|new restaurant|new place)\b/.test(t);
}

function shouldUseBackendProcess(raw: string): boolean {
  return PREORDER_PAYMENT_OR_POLICY_PATTERN.test(raw);
}

function hasNamedBookingRequest(raw: string): boolean {
  const t = normalize(raw);
  return /\b(book|reserve)\s+(?!it\b|anything\b|a table\b|table\b|me\b|somewhere\b|something\b|the usual\b)([a-z0-9']{3,})/.test(t);
}

function isVagueBookingStart(raw: string): boolean {
  const t = normalize(raw);
  return /^(dinner|lunch|breakfast|brunch|table|reservation|book it|just book it|i need food|food|tonight maybe|for us|whatever works|make it good)$/.test(t) ||
    /\b(just get me a table|book anything available|fastest option|skip the questions)\b/.test(t);
}

function choosePendingOption(
  raw: string,
  pendingOptions: CenaivaAvailabilityOption[] | undefined,
): CenaivaAvailabilityOption | null {
  if (!pendingOptions?.length) return null;
  const t = normalize(raw);
  const ordinal =
    /\b(second|2|two)\b/.test(t) ? 1 :
      /\b(first|1|one)\b/.test(t) ? 0 :
        /\b(third|3|three)\b/.test(t) ? 2 :
          null;
  if (ordinal != null && pendingOptions[ordinal]) return pendingOptions[ordinal];

  const parsedDate = parseLocalDate(raw);
  const parsedTime = parseLocalTime(raw, { allowBareTime: true });
  if (!parsedDate && !parsedTime) return null;
  return pendingOptions.find((option) => {
    const sameDate = !parsedDate || option.date === parsedDate;
    const sameTime = !parsedTime || displayTimeToHHMM(option.display_time) === parsedTime;
    return sameDate && sameTime;
  }) ?? null;
}

function displayTimeToHHMM(display: string): string | null {
  const m = display.match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function makeResponse(opts: {
  conversationId: string | null;
  spokenText: string;
  intent: AssistantResponseType['intent'];
  step: AssistantResponseType['step'];
  nextExpectedInput: AssistantResponseType['next_expected_input'];
  uiActions?: UIActionType[];
  booking?: AssistantResponseType['booking'];
}): AssistantResponseType {
  return {
    conversation_id: opts.conversationId ?? '',
    spoken_text: opts.spokenText,
    intent: opts.intent,
    step: opts.step,
    next_expected_input: opts.nextExpectedInput,
    ui_actions: opts.uiActions ?? [],
    booking: opts.booking ?? null,
    map: null,
    filters: null,
    assistant_memory: null,
  };
}

function questionForMissing(booking: BookingState): {
  text: string;
  intent: AssistantResponseType['intent'];
  step: AssistantResponseType['step'];
  next: AssistantResponseType['next_expected_input'];
} {
  if (!booking.restaurant_id) {
    return {
      text: 'What restaurant or area should I book?',
      intent: 'select_restaurant',
      step: 'choose_restaurant',
      next: 'restaurant',
    };
  }
  if (booking.party_size == null) {
    return {
      text: 'How many guests?',
      intent: 'choose_party_size',
      step: 'choose_party',
      next: 'party_size',
    };
  }
  if (!booking.date && !booking.time) {
    return {
      text: 'What date and time should I book?',
      intent: 'choose_date',
      step: 'choose_date',
      next: 'date',
    };
  }
  if (!booking.date) {
    return {
      text: 'What date should I book?',
      intent: 'choose_date',
      step: 'choose_date',
      next: 'date',
    };
  }
  return {
    text: 'What time should I book?',
    intent: 'choose_time',
    step: 'choose_time',
    next: 'time',
  };
}

function buildSetFieldActions(patch: Partial<BookingState>): UIActionType[] {
  const actions: UIActionType[] = [];
  if (patch.party_size != null) {
    actions.push({ type: 'set_booking_field', field: 'party_size', value: patch.party_size });
  }
  if (patch.date) actions.push({ type: 'set_booking_field', field: 'date', value: patch.date });
  if (patch.time) actions.push({ type: 'set_booking_field', field: 'time', value: patch.time });
  if (patch.special_request) {
    actions.push({ type: 'set_booking_field', field: 'special_request', value: patch.special_request });
  }
  return actions;
}

function withPatch(booking: BookingState, patch: Partial<BookingState>): BookingState {
  return { ...booking, ...patch };
}

function buildAvailabilityIntent(
  raw: string,
  date: string | null,
  time: string | null,
  timezone: string,
): Pick<CenaivaAvailabilityRequest, 'mode' | 'date' | 'time' | 'weekday' | 'split_at'> | null {
  const t = normalize(raw);
  const weekday = parseLocalWeekday(raw);
  const wantsAnyDay = /\b(any day|any date|whenever|whatever day|whichever day|any night)\b/.test(t);
  const wantsAnyTime = /\b(any time|anytime|whatever time|whenever|earliest available|latest available)\b/.test(t);
  const wantsFirstAvailable = /\b(as soon as possible|earliest available|fastest option|first available)\b/.test(t);

  if (wantsAnyDay && time) {
    return { mode: 'any_day_at_time', date: null, time, weekday: null, split_at: '14:30' };
  }
  if (weekday != null && wantsAnyTime) {
    return { mode: 'weekday_any_time', date: null, time: null, weekday, split_at: '14:30' };
  }
  if (date && wantsAnyTime) {
    return { mode: 'date_any_time', date, time: null, weekday: null, split_at: '14:30' };
  }
  if (wantsFirstAvailable) {
    return { mode: 'first_available', date: null, time: null, weekday: null, split_at: '14:30' };
  }
  if (date && time) {
    return { mode: 'exact', date, time, weekday: null, split_at: '14:30' };
  }
  if (!date && weekday != null && wantsAnyTime) {
    return { mode: 'weekday_any_time', date: null, time: null, weekday, split_at: '14:30' };
  }
  if (!date && /\bnext weekend\b/.test(t) && wantsAnyTime) {
    return { mode: 'weekday_any_time', date: null, time: null, weekday: 6, split_at: '14:30' };
  }

  // Keep timezone in the signature so call sites are explicit about relative dates.
  void timezone;
  return null;
}

function buildSelectionResponse(
  option: CenaivaAvailabilityOption,
  ctx: LocalBookingContext,
): AssistantResponseType {
  const restaurantId = ctx.booking.restaurant_id ?? ctx.selectedRestaurantId ?? null;
  const restaurantName = ctx.booking.restaurant_name ?? ctx.selectedRestaurantName ?? null;
  const spokenText = `Great, ${formatDateForSpeech(option.date)} at ${option.display_time} is available. Should I book it?`;
  return makeResponse({
    conversationId: ctx.conversationId,
    spokenText,
    intent: 'confirm_booking',
    step: 'confirm',
    nextExpectedInput: 'confirmation',
    uiActions: [
      { type: 'set_booking_field', field: 'date', value: option.date },
      { type: 'set_booking_field', field: 'time', value: option.display_time },
      { type: 'select_time_slot', slot_iso: option.date_time, shift_id: option.shift_id },
      { type: 'confirm_booking' },
    ],
    booking: {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      date: option.date,
      time: option.display_time,
      slot_iso: option.date_time,
      shift_id: option.shift_id,
      status: 'confirming',
    },
  });
}

export function planLocalBookingTurn(ctx: LocalBookingContext): LocalBookingDecision {
  const transcript = ctx.transcript.trim();
  if (!transcript) return { kind: 'pass' };
  const booking = ctx.booking;
  const restaurantId = booking.restaurant_id ?? ctx.selectedRestaurantId ?? null;
  const restaurantName = booking.restaurant_name ?? ctx.selectedRestaurantName ?? null;
  const hasRestaurant = Boolean(restaurantId);
  const timezone = ctx.timezone || 'America/Toronto';

  if (BACKEND_STATUSES.has(booking.status)) return { kind: 'pass' };
  if (booking.status === 'confirming' && isAffirmative(transcript)) return { kind: 'pass' };

  const pendingChoice = choosePendingOption(transcript, ctx.pendingOptions);
  if (pendingChoice) {
    return {
      kind: 'local_response',
      response: buildSelectionResponse(pendingChoice, ctx),
      clearPendingOptions: true,
    };
  }

  const patch: Partial<BookingState> = {};
  if (restaurantId) patch.restaurant_id = restaurantId;
  if (restaurantName) patch.restaurant_name = restaurantName;

  const partySize = booking.party_size == null ? parseLocalPartySize(transcript) : null;
  if (partySize != null) patch.party_size = partySize;

  const nextPartySize = patch.party_size ?? booking.party_size;
  const parsedDate = parseLocalDate(transcript, timezone);
  const parsedTime = parseLocalTime(transcript, {
    allowBareTime: booking.party_size != null,
  });
  if (parsedDate) patch.date = parsedDate;
  if (parsedTime) patch.time = parsedTime;

  const specialRequest = parseSpecialRequest(transcript);
  if (specialRequest) patch.special_request = specialRequest;

  const hasLocalBookingDetail =
    partySize != null ||
    parsedDate != null ||
    parsedTime != null ||
    specialRequest != null;

  if (!isCenaivaProcessPrompt(transcript) && !hasLocalBookingDetail) return { kind: 'pass' };
  if (shouldUseBackendProcess(transcript)) return { kind: 'pass' };
  if (!hasRestaurant && hasNamedBookingRequest(transcript)) return { kind: 'pass' };
  if (wantsBackendDiscovery(transcript, hasRestaurant)) return { kind: 'pass' };

  const nextBooking = withPatch(booking, patch);
  const availabilityIntent = buildAvailabilityIntent(
    transcript,
    nextBooking.date,
    nextBooking.time,
    timezone,
  );

  const hasCollectedAnything =
    Object.keys(patch).some((key) => !['restaurant_id', 'restaurant_name'].includes(key)) ||
    isVagueBookingStart(transcript);

  if (!hasCollectedAnything && !availabilityIntent) return { kind: 'pass' };

  if (!restaurantId || nextPartySize == null || (!availabilityIntent && (!nextBooking.date || !nextBooking.time))) {
    const missing = questionForMissing(nextBooking);
    return {
      kind: 'local_response',
      clearPendingOptions: true,
      response: makeResponse({
        conversationId: ctx.conversationId,
        spokenText: missing.text,
        intent: missing.intent,
        step: missing.step,
        nextExpectedInput: missing.next,
        uiActions: buildSetFieldActions(patch),
        booking: {
          ...patch,
          status: 'collecting_minimum_fields',
        },
      }),
    };
  }

  const intent = availabilityIntent ?? {
    mode: 'exact' as const,
    date: nextBooking.date,
    time: nextBooking.time,
    weekday: null,
    split_at: '14:30',
  };

  const responseBeforeCheck = makeResponse({
    conversationId: ctx.conversationId,
    spokenText: 'One moment please.',
    intent: 'choose_time',
    step: 'choose_time',
    nextExpectedInput: 'none',
    uiActions: buildSetFieldActions(patch),
    booking: {
      ...patch,
      status: 'loading_availability',
    },
  });

  return {
    kind: 'check_availability',
    filler: responseBeforeCheck.spoken_text,
    responseBeforeCheck,
    request: {
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      party_size: nextPartySize,
      mode: intent.mode,
      date: intent.date ?? null,
      time: intent.time ?? null,
      weekday: intent.weekday ?? null,
      timezone,
      search_days: 21,
      nearest_count: 2,
      split_at: intent.split_at ?? '14:30',
    },
  };
}

function formatOption(option: CenaivaAvailabilityOption): string {
  return `${formatDateForSpeech(option.date)} at ${option.display_time}`;
}

function formatOptionList(options: CenaivaAvailabilityOption[]): string {
  const labels = options.slice(0, 2).map(formatOption);
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels[0]} or ${labels[1]}`;
}

function formatDateForSpeech(dateStr: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const localNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(localNoon);
}

export function buildLocalAvailabilityResponse(args: {
  conversationId: string | null;
  request: CenaivaAvailabilityRequest;
  result: CenaivaAvailabilityResponse;
}): { response: AssistantResponseType; pendingOptions: CenaivaAvailabilityOption[] } {
  const { conversationId, request, result } = args;
  const selected = result.selected_slot ?? null;
  if (result.status === 'available' && selected) {
    const ctx: LocalBookingContext = {
      transcript: '',
      booking: {
        restaurant_id: request.restaurant_id,
        restaurant_name: request.restaurant_name ?? null,
        party_size: request.party_size,
        date: selected.date,
        time: selected.display_time,
        shift_id: selected.shift_id,
        slot_iso: selected.date_time,
        special_request: null,
        occasion: null,
        status: 'loading_availability',
        confirmation_code: null,
        reservation_id: null,
        want_preorder: null,
        order_id: null,
        payment_status: 'idle',
        tip_choice: null,
        tip_amount: null,
        tip_percent: null,
        payment_split: null,
        pending_action: null,
        cart_subtotal: 0,
        cart: [],
        has_saved_card: false,
      },
      conversationId,
    };
    return { response: buildSelectionResponse(selected, ctx), pendingOptions: [] };
  }

  const alternatives = result.alternatives ?? [];
  if (alternatives.length) {
    const requestedTime = request.time ? formatHHMMForSpeech(request.time) : null;
    const unavailablePrefix =
      request.mode === 'exact' && request.date && requestedTime
        ? `${formatDateForSpeech(request.date)} at ${requestedTime} is not available. `
        : '';
    return {
      pendingOptions: alternatives,
      response: makeResponse({
        conversationId,
        spokenText: `${unavailablePrefix}I found ${formatOptionList(alternatives)}. Which should I use?`,
        intent: 'choose_time',
        step: 'choose_time',
        nextExpectedInput: 'time',
        uiActions: [{ type: 'load_availability' }],
        booking: {
          restaurant_id: request.restaurant_id,
          restaurant_name: request.restaurant_name ?? null,
          party_size: request.party_size,
          date: request.date ?? null,
          time: request.time ?? null,
          status: 'awaiting_time_selection',
        },
      }),
    };
  }

  return {
    pendingOptions: [],
    response: makeResponse({
      conversationId,
      spokenText: result.message || 'I could not find availability for that. What date and time should I try instead?',
      intent: 'choose_time',
      step: 'choose_time',
      nextExpectedInput: 'time',
      booking: {
        restaurant_id: request.restaurant_id,
        restaurant_name: request.restaurant_name ?? null,
        party_size: request.party_size,
        status: 'collecting_minimum_fields',
      },
    }),
  };
}

function formatHHMMForSpeech(time: string): string {
  const [hourRaw, minuteRaw] = time.split(':');
  const hour = parseInt(hourRaw, 10);
  const minute = parseInt(minuteRaw ?? '0', 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const date = new Date(Date.UTC(2026, 0, 1, hour, minute));
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date);
}
