// Parses the `data.route` string baked into a slot_opened notification into a
// shape the mobile app can navigate with. Web emits routes like
// `/<slug>?date=YYYY-MM-DD&time=HH:MM&party=N` for restaurant alerts and
// `/deals?event=<id>&party=N` for event alerts.

export type ParsedSlotOpenedRoute =
  | {
      kind: 'restaurant';
      slug: string;
      date?: string;
      time?: string;
      party?: number;
    }
  | {
      kind: 'event';
      eventId: string;
      restaurantId?: string;
      party?: number;
    }
  | null;

function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!qs) return out;
  for (const pair of qs.split('&')) {
    if (!pair) continue;
    const [rawKey, rawValue = ''] = pair.split('=');
    if (!rawKey) continue;
    try {
      out[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, '%20'));
    } catch {
      out[rawKey] = rawValue;
    }
  }
  return out;
}

function pickInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function parseSlotOpenedRoute(
  route: string | undefined | null,
  data?: Record<string, unknown> | null,
): ParsedSlotOpenedRoute {
  if (!route || typeof route !== 'string') return null;
  const stripped = route.startsWith('/') ? route.slice(1) : route;
  const [pathPart = '', queryPart = ''] = stripped.split('?');
  const params = parseQuery(queryPart);

  if (pathPart === 'deals') {
    const eventId = params.event ?? (typeof data?.['event_id'] === 'string' ? (data['event_id'] as string) : '');
    if (!eventId) return null;
    const restaurantId =
      typeof data?.['restaurant_id'] === 'string' ? (data['restaurant_id'] as string) : undefined;
    return {
      kind: 'event',
      eventId,
      restaurantId,
      party: pickInt(params.party),
    };
  }

  if (pathPart) {
    return {
      kind: 'restaurant',
      slug: pathPart,
      date: params.date || undefined,
      time: params.time || undefined,
      party: pickInt(params.party),
    };
  }

  return null;
}
