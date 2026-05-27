# Apple Review Reply — Submission 34841f38-3565-4cb5-a036-1be7d4d0fcb2

Paste the text below into the **Reply** field on the rejected submission in App Store Connect. Then attach **build 29** (the one EAS is producing now — wait until it lands in TestFlight + the processing checkmark appears) and click **Submit for Review**. Do not send for review until build 29 is selected.

---

## Reply text — paste as-is

Hi App Review team — thanks for the careful look. Build 1.0 (29) addresses both issues. Details below.

**Guideline 2.1 — Information needed (cookies/tracking)**

Answering each of your three questions directly:

1. **Is the data collected by the app shared with any third-party data brokers?**
   No. Cenaiva does not share user data with data brokers. We have no data-broker SDKs integrated and no server-side pipelines that export user data to brokers.

2. **Is the data collected by the app linked with third-party data for marketing or advertising purposes?**
   No. We do not link user data with third-party data for marketing or advertising. We have no ad-network SDKs, no audience-matching providers, and no marketing-attribution providers in the build (verifiable from package.json). The only third-party SDKs that receive any data are Sentry (crash diagnostics, with PII scrubbing) and PostHog (product analytics, opt-in via Profile → Privacy). Neither shares data with marketing or advertising partners.

3. **When users access web content in the app, are cookies collected for tracking purposes by the app or service?**
   Not applicable. Cenaiva has no in-app web content. There are no WebViews; all UI is native React Native. No cookies are read, written, or transmitted by the app.

**What changed in build 29 to make this clear**

We removed the launch-time "cookie preferences" sheet. That sheet was a mobile mirror of our web cookie banner — but on mobile it was misleading because mobile uses no cookies and no marketing tracking SDKs, so the "Marketing cookies" toggle did not actually control anything. The real, working analytics opt-out remains where it belongs: **Profile → Privacy → Analytics & crash reporting**, which gates the PostHog SDK via `setPosthogEnabled()`.

**Guideline 5.1.1(v) — Registration required for non-account features**

Fixed. Unauthenticated visitors can now freely browse the Discover tab — restaurant tiles, the full menu, photos, hours, price tier, and the map view — without creating an account. Registration is requested only when the user taps an account-based action (Book a Table, Save/Favorite, Post a Review, View My Bookings, Open Profile, etc.).

To make this path easy to find during your re-review: the Welcome screen now has a **"Browse without an account"** link directly below the Sign in / Create Account buttons. Tapping it takes you straight into the Discover tab.

Test path you can follow on build 29:
1. Launch app → Welcome.
2. Tap **"Browse without an account"** → Discover loads, no login required.
3. Tap any restaurant tile → restaurant detail screen with menu, photos, hours, price tier, all visible while signed out.
4. Tap **"Book a Table"** → now you're prompted to sign in (this is the account-based action).

Thank you again — happy to clarify anything further if it helps move the review along.

---

## After Apple replies

If Apple comes back with *more* questions, the most likely follow-up areas (and the truthful answers):

- **"Does PostHog share data with brokers?"** No. PostHog stores product analytics in our own self-hosted-equivalent account and does not sell, broker, or share with advertisers. They're a processor under our DPA.
- **"Does Sentry share data with brokers?"** No. Sentry receives crash reports + breadcrumbs (with PII scrubbing in `app/_layout.tsx beforeSend`). Sentry is a processor, not a broker.
- **"Is there any tracking that happens before login?"** Sentry's crash SDK initializes at app boot before login. PostHog initializes at boot but starts disabled and only sends events after the user opts in via Profile → Privacy.

If Apple asks you to **explicitly choose** that the app does *not* implement App Tracking Transparency, the answer is: we don't trigger ATT because we don't track per Apple's definition (no linking to third-party data for ads, no sharing with data brokers).
