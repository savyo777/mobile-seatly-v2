function localHourInTimeZone(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    if (Number.isFinite(hour)) return hour;
  } catch {
    // Fall through to the runtime's local clock if Intl rejects the timezone.
  }
  return new Date().getHours();
}

export function mealPeriodForTimeZone(
  timezone: string,
): "breakfast" | "lunch" | "dinner" {
  const hour = localHourInTimeZone(timezone);
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  return "dinner";
}

export function scopedOffTopicFallback(timezone: string): string {
  const meal = mealPeriodForTimeZone(timezone);
  return `I hear you, but my mission is to make sure you find the perfect ${meal} for you. What can I help with?`;
}

export function scopedWarmBoundaryFallback(): string {
  return "I'm flattered, but my mission is to provide you a perfect dining experience. What can I do for you?";
}

function normalizePersonalRemark(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DINING_SCOPE_PATTERN =
  /\b(restaurant|restaurants|reservation|reserve|book|booking|table|dine|dining|dinner|lunch|breakfast|brunch|eat|eating|food|menu|dish|dishes|cuisine|preorder|order|directions|rewards|cenaiva|bar|cafe|coffee|sushi|pizza|pasta|steak|taco|tacos|burger|vegan|halal|kosher|date spot|romantic|near me|nearby|closest|open)\b/i;

const GENERAL_OFF_TOPIC_PATTERN =
  /\b(weather|forecast|sports|score|news|stock|stocks|crypto|bitcoin|homework|assignment|essay|code|debug|programming|math|poem|story|joke|movie|song|lyrics|capital|president|prime minister|election|translate|translation|define|definition|history|science|medical|doctor|lawyer|legal|recipe|flight|airline|hotel|taxi|uber|timer|alarm|reminder|calendar|email|text message|shopping|amazon|youtube|netflix|podcast|video game|game)\b/i;

export function knownGeneralOffTopicIntent(transcript: string): boolean {
  const normalized = normalizePersonalRemark(transcript);
  if (!normalized || DINING_SCOPE_PATTERN.test(normalized)) return false;
  return GENERAL_OFF_TOPIC_PATTERN.test(normalized);
}

function diningCuteContext(value: string): boolean {
  return /\b(cute|nice|pretty|beautiful|romantic)\s+(place|restaurant|spot|date spot|dinner spot|lunch spot|brunch spot|cafe|bar)\b/i
    .test(value) ||
    /\b(place|restaurant|spot|cafe|bar)\s+(is\s+)?(cute|nice|pretty|beautiful|romantic)\b/i
      .test(value);
}

export function playfulPersonalOffTopicIntent(transcript: string): boolean {
  const normalized = normalizePersonalRemark(transcript);
  if (!normalized || diningCuteContext(normalized)) return false;

  return /\b(i love you|love you|luv you|marry me|date me|go out with me|are you single)\b/i
    .test(normalized) ||
    /\b(be my|be mine)\s+(girlfriend|boyfriend|wife|husband|date)\b/i.test(
      normalized,
    ) ||
    /\b(you|u|cenaiva|assistant|your voice)\b.{0,28}\b(cute|pretty|beautiful|hot|sexy|adorable|sweet|funny|smart|cool|gorgeous)\b/i
      .test(normalized) ||
    /\b(you're|youre|you are|your|ur)\s+(cute|pretty|beautiful|hot|sexy|adorable|sweet|funny|smart|cool|gorgeous)\b/i
      .test(normalized) ||
    /\b(do you love me|do you think i'm cute|am i cute)\b/i.test(normalized);
}
