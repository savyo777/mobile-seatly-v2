# i18n: web vs mobile key mapping

Web ([StevenGeorgy/Cenaiva](https://github.com/StevenGeorgy/Cenaiva)) uses **one namespace** per locale file:

- `apps/web/src/locales/en/common.ts` — default export is nested under `common`; i18next namespace is typically `common`.
- Keys use **dot notation** in code, e.g. `t('common.booking.step1.title')`.

Mobile ([`lib/i18n/locales/en.ts`](../../lib/i18n/locales/en.ts)) uses **top-level groups** as implicit namespaces:

- `booking.step1Title` → `t('booking.step1Title')` (flat/snake-case suffixes)
- `discover.sectionTrending`
- `profile.personalInfo`

## Aligned concepts (same copy, different paths)

| Concept | Web (`common` namespace) | Mobile |
|--------|---------------------------|--------|
| Booking step 1 title | `booking.step1.title` | `booking.step1Title` |
| Booking step 2 title | `booking.step2.title` | `booking.step2Title` |
| Booking step 7 title | `booking.step7.title` | `booking.step7Title` |
| Discover screen title | `routes.discover.title` | `discover.title` |
| Account / profile hub | `routes.account.title` | `profile.*` keys |

## Convention for future parity

1. When adding a string that exists on web, add a comment in mobile `en.ts` / `fr.ts`:  
   `// web: common.booking.step1.title`
2. Prefer **matching English copy** even when keys differ; optionally migrate mobile keys to nested `booking.step1.title` in a later i18n refactor (would require `booking: { step1: { title: '...' } }` structure in mobile resources).
3. Auth strings on web live under `common.auth.*`; mobile uses `login.*`, `register.*`, etc. — keep copy in sync manually until a shared JSON package is introduced.

## Shared module (reference)

[`lib/i18n/webKeyAliases.ts`](../../lib/i18n/webKeyAliases.ts) documents stable web paths for the overlapping booking flow.
