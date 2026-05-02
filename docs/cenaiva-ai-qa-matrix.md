# Cenaiva AI Prompt And Scenario QA Matrix

The executable source of truth is `lib/cenaiva/qa/promptMatrix.ts`. It contains the full prompt catalog, expected intents, required extracted fields, expected UI behavior, and forbidden behavior for each scenario.

## Success Definition

Cenaiva passes the matrix when every prompt:

- Resolves to one of its expected intents.
- Preserves already collected booking fields across turns.
- Shows map/cards for discovery and planning prompts.
- Asks only the minimum missing booking question.
- Confirms restaurant, party size, exact date, and exact time before final booking.
- Never uses the legacy fallback `Want me to look something else up?`.
- Never guarantees allergy safety or accessibility unless confirmed data supports it.
- Never creates a reservation, cancels a reservation, stores sensitive data, or charges payment without explicit confirmation.

## Prompt Groups

- Reservation creation: direct booking, cuisine/location/time, vibe, outdoor seating, last restaurant, urgent availability.
- Dinner planning: date nights, anniversaries, parents, friends, events, dessert, budget, quiet restaurants.
- Discovery: open now, hidden gems, trending, availability tonight, private rooms, live music, preorderable restaurants.
- Menu questions: item availability, vegan/gluten-free/kids meals, spice, alcohol, preorder, notes.
- Booking changes: time, party size, date, seating, birthday notes, name changes, directions/contact.
- Cancellation and late arrival: cancel confirmation, grace-period risk, restaurant note/contact.
- Accessibility and dietary safety: wheelchair, stairs, low noise, allergies, halal, kosher, vegan, gluten-free.
- Budget and vibe: cheap, value, deals, romantic, classy, lively, business, photo-friendly.
- Ambiguous and voice-recognition failures: vague booking, "book for floor", place/date/time ambiguity.
- No availability: alternate times, nearby restaurants, party-size changes, waitlist/notify.
- Groups, kids, elderly, students, business users, tourists, and language variations.
- Restaurant rules: deposits, patio first-come-first-served, kitchen close, manager approval, private room.
- Privacy and abuse prevention: contact sharing, saved preferences, cards, duplicate/mass/prank bookings.
- Preorder and prepay: live menu, cart updates, checkout-open prepay without automatic charge.

## Commands

Run the mobile QA gate:

```bash
npm run test:cenaiva
npm run typecheck
npx expo config --type public
npx expo-doctor
```

Run the backend source-of-truth gate from `Seatly-7`:

```bash
deno test supabase/functions/cenaiva-orchestrate/followup.test.ts
npm run build
```

## Current Prepay Scope

The current mobile build supports preorder order creation and navigation to the checkout screen. The checkout screen explicitly states that secure mobile payment is not connected yet. Therefore, QA should pass prepay only when the pending order and line items are created and checkout opens; it should not claim real card, Apple Pay, or Google Pay payment success.

