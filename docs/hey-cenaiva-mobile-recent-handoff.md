# Hey Cenaiva Mobile Recent Handoff

This handoff documents the recent Hey Cenaiva mobile work in `mobile-seatly-v2-4`, what was changed, how it was tested, and how the iOS Simulator/dev-client setup was accessed.

Repository:

```text
/Users/stevengeorgy/mobile-seatly-v2-4
```

Related web source-of-truth repositories inspected:

```text
/Users/stevengeorgy/Seatly-7
/Users/stevengeorgy/Seatly
```

## Current Goal

The user wants Hey Cenaiva on mobile to behave like the web app:

- Foreground wake phrase should work on customer pages.
- The app must ask for microphone permission in a native development build.
- The wake phrase should activate quickly, not after a long delay.
- Voice/STT must be stable enough for booking flow.
- When a cuisine/filter response is returned, the bottom restaurant rail in the Hey Cenaiva layout must filter to matching restaurants too.
- Broad discovery prompts like `I want food nearby` or `I'm not sure` must show recommendations instead of looping on `What kind of cuisine are you looking for?`
- Preorder/prepay/booking behavior must continue to pass the Cenaiva test suite.

## Important Current Git State

At the time of this handoff, the worktree has uncommitted changes in:

```text
__tests__/cenaiva/promptMatrix.test.ts
__tests__/cenaiva/wakeWordPhrases.test.ts
components/cenaiva/CenaivaVoiceShell.tsx
lib/cenaiva/qa/promptMatrix.ts
lib/cenaiva/voice/useCenaivaWakeWord.ts
lib/cenaiva/voice/useMobileTranscription.ts
lib/cenaiva/voice/wakeWordPhrases.ts
```

New untracked files:

```text
__tests__/cenaiva/filterRestaurants.test.ts
lib/cenaiva/filterRestaurants.ts
docs/hey-cenaiva-mobile-recent-handoff.md
```

There is also an existing QA document:

```text
docs/cenaiva-ai-qa-matrix.md
```

Do not assume all dirty files were unrelated. The current dirty files are part of the recent Hey Cenaiva work unless inspection proves otherwise.

## What Was Implemented Recently

### 1. Wake word reliability and immediate activation

Main files:

```text
lib/cenaiva/voice/useCenaivaWakeWord.ts
lib/cenaiva/voice/wakeWordPhrases.ts
__tests__/cenaiva/wakeWordPhrases.test.ts
```

Changes made:

- Mobile wake recognition now defaults to `en-US`.
- iOS wake recognition uses on-device recognition:

```ts
requiresOnDeviceRecognition: Platform.OS === 'ios'
```

- iOS wake recognition no longer asks for speech-recognition permission when on-device recognition is used; it relies on microphone permission.
- Wake listener restart timings were made less aggressive:

```text
RESTART_BASE_MS = 400
RESTART_AFTER_END_MS = 400
```

- Fixed a major restart/abort loop:
  - Previously, `startListening` could abort/restart while native recognition was already starting or active.
  - Now it skips a duplicate start if `activeRef` or `startingRef` is true.
  - If native state says `recognizing` or `starting`, refs are updated and the hook does not abort the recognizer.

- Added rolling transcript matching:
  - Keeps a 3.5 second rolling transcript window.
  - Keeps the last 18 words.
  - This handles native STT splitting the wake phrase across partial results, such as `Hey` first and `Geneva` later.

- On wake match:
  - Wake listener disables itself.
  - Native recognition is aborted to release the microphone.
  - Rolling transcript is reset.
  - `onWakeRef.current()` opens the assistant.

- Debug logging now only prints if this env var is set:

```env
EXPO_PUBLIC_CENAIVA_VOICE_DEBUG=true
```

This was intentional. Transcript dumping was useful during debugging, but should not remain enabled by default.

### 2. Expanded wake phrase and pronunciation coverage

Main file:

```text
lib/cenaiva/voice/wakeWordPhrases.ts
```

The mobile matcher started from the web app's wake list in:

```text
/Users/stevengeorgy/Seatly-7/apps/web/src/hooks/useCenaivaWakeWord.ts
```

Then it was expanded for native mobile STT patterns.

Patterns now covered include:

- Canonical:
  - `hey cenaiva`
  - `hey senaiva`
  - `hey seneva`
  - `hey ceneva`
  - `hey ceniva`

- Pronunciation of Cenaiva as "sin-eye-vuh":
  - `hey sin eye va`
  - `hey sine eye va`
  - `hey sin i va`
  - `hey sin iva`
  - `hey sine iva`
  - `hey sinai va`
  - `hey sinaiva`
  - `hey siniva`

- Common native/iOS misrecognitions:
  - `hey geneva`
  - `he's Geneva`
  - `heres geneva`
  - `here is geneva`
  - `hey chennai`
  - `hey chennaiwa`
  - `hey cheniva`
  - `hey anova`
  - `hey a nova`
  - `hey nova`
  - `here's the nova`
  - `he's anova`

- User-provided noisy observed transcripts:
  - `here's the nova`
  - `here's the nova he's anov`
  - `here's the nova he's anova`
  - `hey son over he's an over he's an over he's a neighbor he's another`
  - `um it's an ivor`
  - `um ace and iva a soniva a sonova is a nova`
  - `hey saniv`
  - `hey saniva`
  - `hey soniva he's an evil`

- Additional accent/greeting variants:
  - `hi cenaiva`
  - `high cenaiva`
  - `hiya cenaiva`
  - `hello cenaiva`
  - `ok cenaiva`
  - `okay cenaiva`
  - `yo cenaiva`
  - `hola cenaiva`
  - `bonjour cenaiva`
  - `allo cenaiva`
  - `salut cenaiva`

- Diacritic normalization:
  - `hey cenaiva` also matches if the recognizer/user input includes accented characters like `cenaiva`, `cenaiva` with accents, `naiva`, etc. The code strips combining marks before matching.

The matcher intentionally does not wake on generic fragments alone:

```text
hello
here
here's
he
he's
son
um
hey
hi
high
hiya
okay
yo
hola
bonjour
salut
here is
he is
```

### 3. Wake phrase tests

Main file:

```text
__tests__/cenaiva/wakeWordPhrases.test.ts
```

Added a large deterministic corpus covering:

- Canonical web wake phrases.
- Mobile pronunciation families.
- iOS/Apple native transcription patterns.
- Accent and greeting variations.
- Noisy cumulative native transcripts from the user's logs.
- Negative tests for generic one-word fragments and unrelated restaurant speech.

This is the most reliable way to test the majority of wake transcriptions because iOS Simulator does not provide a clean audio injection API for microphone input.

### 4. Voice STT stability improvements

Main file:

```text
lib/cenaiva/voice/useMobileTranscription.ts
```

Changes made:

- Deepgram token is fetched before recording starts and cached in a ref for that turn.
- Deepgram transcription uses the cached token instead of waiting until after the recording.
- `NO_SPEECH_TIMEOUT_MS` reduced from 6000 to 4500.
- `METERING_SPEECH_DB` tightened from `-50` to `-24` to reduce false speech detection from background noise.
- If recording finishes without detected speech, it resolves without sending to Deepgram.
- Added `EXPO_PUBLIC_CENAIVA_VOICE_DEBUG=true` gated diagnostics for:
  - permission result
  - Deepgram token result
  - Deepgram transcription response
  - native speech fallback start/result/error/end
  - recording start/finish

Fallback behavior:

- If Deepgram is disabled, unavailable, or preflight fails in a fallback-safe way, the hook can use native speech recognition.
- It does not fall back for permission denial or native service/language blocks.

### 5. Restaurant rail filtering in Hey Cenaiva layout

Main files:

```text
components/cenaiva/CenaivaVoiceShell.tsx
lib/cenaiva/filterRestaurants.ts
__tests__/cenaiva/filterRestaurants.test.ts
```

Problem:

- The assistant could apply cuisine filters to state/map, but the bottom restaurant rail still showed restaurants only by marker ids or all restaurants.
- User specifically asked that cuisine filtering also affect the row of restaurants in the Hey Cenaiva layout.

Fix:

- Added `filterCenaivaRestaurants`.
- It filters by:
  - returned marker restaurant ids
  - `filters.cuisine`
  - `filters.city`
  - `filters.query`

- `CenaivaVoiceShell` now uses:

```ts
filterCenaivaRestaurants(restaurants, state.map.marker_restaurant_ids, state.filters)
```

instead of local marker-only filtering.

Tests added:

- Filters by cuisine even when marker ids are omitted.
- Applies cuisine filters within the current marker set.
- Filters by query and city.

### 6. Broad discovery prompt regression guard

Main files:

```text
lib/cenaiva/qa/promptMatrix.ts
__tests__/cenaiva/promptMatrix.test.ts
```

Problem:

- User reported that `I want food nearby` kept causing Cenaiva to ask what cuisine the user wanted.
- If the user said `I'm not sure`, it repeated the same output.

Fix/test guard:

- Added broad restaurant-search scenarios:

```text
I want food nearby.
I'm hungry, show me food nearby.
I'm not sure, anything is fine.
I don't know, you pick something good.
Whatever is good near me.
```

- Added forbidden text:

```text
What kind of restaurant are you looking for?
```

- Added a test ensuring a broad discovery response that loops back to that question is rejected for:
  - forbidden text
  - missing UI action

The goal is that broad discovery should show recommendations/cards/map actions, not ask for cuisine again.

## Tests Run

Focused wake phrase tests:

```bash
npm run test:cenaiva -- --runTestsByPath __tests__/cenaiva/wakeWordPhrases.test.ts
```

Result:

```text
PASS
9 tests passed
```

Full Cenaiva suite:

```bash
npm run test:cenaiva
```

Latest result:

```text
PASS
8 suites passed
51 tests passed
```

TypeScript:

```bash
npm run typecheck
```

Latest result:

```text
PASS
tsc --noEmit completed without errors
```

## Simulator And Dev Build Setup Used

The user had been running `npx expo start`, which usually opens the app in Expo Go. Expo Go does not include native modules like `expo-speech-recognition`, so it showed:

```text
Voice recognition is unavailable in this build.
```

The correct setup is a native Expo development build plus Metro in dev-client mode.

Metro/dev-client command used:

```bash
npx expo start --dev-client --clear --port 8082
```

Current dev-client URL used during testing:

```text
cenaiva://expo-development-client/?url=http%3A%2F%2F10.0.0.69%3A8082
```

Command to open the installed dev build in the booted iOS Simulator:

```bash
xcrun simctl openurl booted 'cenaiva://expo-development-client/?url=http%3A%2F%2F10.0.0.69%3A8082'
```

Simulator observed:

```text
iPhone 16e
iOS 26.3
App: Simulator
```

Computer access used:

- Terminal commands through Codex.
- `mcp__computer_use__` tool to inspect and click the Simulator window.
- Simulator menu through AppleScript/clicks when needed.

Audio setup checked:

```bash
xcrun simctl io booted enumerate
```

Observed audio route:

```text
Guest Audio Input -> Default Host Audio Device
Guest Audio Output -> Host Audio Device #BuiltInSpeakerDevice
Host Audio Devices:
  BuiltInMicrophoneDevice: MacBook Air Microphone
  BuiltInSpeakerDevice: MacBook Air Speakers
```

Mac volume checks:

```bash
osascript -e 'output volume of (get volume settings)'
osascript -e 'input volume of (get volume settings)'
```

Both were set to 100 during simulator testing.

## Simulator Testing Performed

### Permission prompt

After clearing/resetting simulator permissions and relaunching the dev build:

- The microphone permission prompt appeared.
- I clicked Allow for microphone.
- This confirmed that microphone permission prompting works in the native dev build.

Important:

- iOS/Android will not keep showing the microphone popup if the app already has a stored allow/deny choice.
- Delete/reinstall the app or reset simulator privacy to retest first-run permission behavior.

Potential reset command for simulator:

```bash
xcrun simctl privacy booted reset microphone com.cenaiva.app
```

### Wake success observed

One acoustic simulator test using macOS `say` successfully flowed through the native recognizer:

```bash
say "Hey Cenaiva"
```

iOS native STT heard it as:

```text
He's Geneva
```

The wake matcher returned:

```text
isWakePhrase: true
```

The assistant opened into the Hey Cenaiva map/rail layout. This is the key reason `He's Geneva` and related Apple-native patterns are now covered.

### Later acoustic testing limitation

Later attempts using `say "Hey Cenaiva"` and `say -v Samantha -r 120 "Hey Geneva"` were not reliable because iOS Simulator takes microphone input from the host microphone. macOS `say` audio through the speakers was inconsistently captured and often mixed with real ambient speech.

This is a simulator/audio-route limitation, not a deterministic app failure.

Observed later logs showed the wake listener receiving unrelated ambient phrases like:

```text
Daniel Caesar ...
Billie Jean ...
What happened
```

These did not wake the assistant, which is good negative behavior.

Best way for the next agent to continue acoustic testing:

- Use a real physical phone with the installed dev build.
- Or speak directly near the Mac microphone while the iOS Simulator has audio input set to the MacBook Air Microphone.
- Enable `EXPO_PUBLIC_CENAIVA_VOICE_DEBUG=true` only while testing transcript output.

## Location Permission Prompt

After a successful wake-open, the simulator showed the iOS location permission prompt:

```text
Allow "Cenaiva" to use your location?
```

I did not grant location permission without explicit user approval.

If the next agent needs to clear the prompt for testing, get user approval before choosing `Allow Once` or `Allow While Using App`, because granting location permission gives the app access to device location while in use.

## Cache Clearing Done

The user approved clearing temp caches.

Cleared:

```text
/private/var/.../T/metro-cache
/private/var/.../T/node-compile-cache
/Users/stevengeorgy/Library/Developer/Xcode/DerivedData
```

This helped free disk space and eliminate stale Metro/native build state.

## How To Reproduce Current Local Validation

From repo root:

```bash
cd /Users/stevengeorgy/mobile-seatly-v2-4
npm run test:cenaiva
npm run typecheck
```

For wake-only validation:

```bash
npm run test:cenaiva -- --runTestsByPath __tests__/cenaiva/wakeWordPhrases.test.ts
```

For simulator/dev-client:

```bash
npx expo start --dev-client --clear --port 8082
xcrun simctl openurl booted 'cenaiva://expo-development-client/?url=http%3A%2F%2F10.0.0.69%3A8082'
```

If port 8082 or the IP changes, update the dev-client URL shown by Metro.

To enable wake/STT logs temporarily:

```env
EXPO_PUBLIC_CENAIVA_VOICE_DEBUG=true
```

Then restart Metro/dev-client.

Do not leave voice debug enabled for normal app usage because it can print transcript details.

## What Is Not Fully Proven Yet

Be precise with the user. Do not claim 100 percent device coverage until these are actually run on devices:

- iOS physical device wake phrase matrix.
- Android physical device wake phrase matrix.
- Deepgram STT on physical device.
- TTS interruption on physical device.
- End-to-end booking QA on physical iOS and Android.
- Preorder/prepay end-to-end on physical iOS and Android.

What is proven locally:

- Unit/integration tests for the Cenaiva mobile code pass.
- TypeScript passes.
- iOS Simulator dev build can prompt for microphone permission.
- iOS Simulator native STT can emit transcript events.
- A native STT transcript of `He's Geneva` successfully opened Hey Cenaiva.
- The expanded wake corpus is covered by deterministic tests.
- The listener ignored unrelated ambient speech during simulator testing.

## Suggested Next Steps For The New Agent

1. Review dirty files and this handoff before editing.
2. Run:

```bash
npm run test:cenaiva
npm run typecheck
```

3. Start the dev client:

```bash
npx expo start --dev-client --clear --port 8082
```

4. Launch the installed dev build in simulator or physical device.
5. If transcript logs are needed, temporarily set:

```env
EXPO_PUBLIC_CENAIVA_VOICE_DEBUG=true
```

6. Test wake with real speech, not only `say`, using variants from `__tests__/cenaiva/wakeWordPhrases.test.ts`.
7. Confirm the assistant opens to the map/restaurant rail layout and greets the user.
8. Test broad discovery prompts:

```text
I want food nearby.
I'm not sure, anything is fine.
I don't know, you pick something good.
Whatever is good near me.
```

Expected behavior:

- Show restaurant recommendations/cards/map actions.
- Do not loop on `What kind of restaurant are you looking for?`

9. Test cuisine filter:

```text
Show me Italian restaurants nearby.
Show me halal restaurants nearby.
Show me sushi near me.
```

Expected behavior:

- Returned map/marker state and bottom rail should both filter to matching restaurants.

10. Continue physical iOS and Android validation for wake, mic permissions, Deepgram STT, TTS interruption, booking confirmation, preorder, and prepay.

## Notes About Earlier User Requests

The user also previously requested that the welcome/login page show sign-in and create-account buttons instead of a centered `Continue as a diner` flow, applicable to both owners and customers. No recent dirty files in this handoff show login-page changes. The next agent should verify that separately before assuming it is complete.

The user previously asked for temporary wake transcription analyzer UI. That temporary UI should remain removed. Console transcript logging is now gated behind `EXPO_PUBLIC_CENAIVA_VOICE_DEBUG=true`.

