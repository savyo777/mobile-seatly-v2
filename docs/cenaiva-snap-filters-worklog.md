# Cenaiva Snap Filters Worklog

This document describes the snap camera, filter, caption, reward, sharing, and camera-roll work that was completed for the Cenaiva snap flow. It is intentionally detailed so future work can trace which files changed, what each piece does, and why the current behavior exists.

## User-Facing Summary

The snap posting flow now works like this:

1. The center customer tab uses a camera icon instead of a plus icon.
2. Users pick a restaurant and enter the snap camera flow.
3. After taking or choosing a photo, tapping Next opens Style your snap directly.
4. Style your snap shows the new Cenaiva story filters from the supplied HTML design set.
5. The old filters were removed from the style screen and replaced by the new filter registry.
6. Filters stay attached when the user continues to Add Caption.
7. The Add Caption screen uses the same photo frame sizing as Style your snap.
8. The reward screen shows the snap preview with the selected filter metadata.
9. The reward screen includes a Save to your camera roll action.
10. The app attempts to save the final snap automatically when the user reaches the reward screen.
11. In Expo Go, when native view capture is unavailable, Cenaiva keeps the original photo plus filter metadata so the filter still appears in-app.
12. In a Cenaiva development build with the native modules installed, the app can flatten the filter onto the photo for saving or native sharing.

## Navigation Icon Change

File changed:

- `app/(customer)/_layout.tsx`

The middle customer tab used to render:

```tsx
<Ionicons
  name="add"
  size={30}
  color={c.bgBase}
/>
```

It now renders:

```tsx
<Ionicons
  name="camera"
  size={28}
  color={c.bgBase}
/>
```

The accessibility label changed from:

```tsx
accessibilityLabel="Post food"
```

to:

```tsx
accessibilityLabel="Open snap camera"
```

The button still keeps the same gold circular styling, haptic feedback, and route:

```tsx
router.push('/(customer)/discover/post-review' as Href);
```

Only the icon and accessibility wording changed.

## Old Overlay System Removal

The old snap overlay implementation was removed from the active flow.

Deleted files:

- `components/snapOverlays/SnapOverlayLayer.tsx`
- `lib/snapOverlays/catalog.ts`
- `lib/snapOverlays/types.ts`

The old system was replaced with the new `storyFilters` system. The new system is component-based, typed, registry-driven, and built around the actual filter designs from the HTML reference.

The remaining file under `lib/snapOverlays/` is:

- `lib/snapOverlays/captureStyledSnap.ts`

That file is still used because it owns native view capture. It now captures the new story-filter view rather than the deleted old overlay layer.

## New Story Filter System

New folders added:

- `components/storyFilters/`
- `components/storyFilters/filters/`
- `lib/storyFilters/`

The main pieces are:

- `lib/storyFilters/types.ts`
- `lib/storyFilters/registry.ts`
- `lib/storyFilters/fonts.ts`
- `lib/storyFilters/previewLayout.ts`
- `components/storyFilters/StoryFilterFrame.tsx`
- `components/storyFilters/StoryWatermark.tsx`
- `components/storyFilters/glyphs.tsx`
- `components/storyFilters/StoryFilterPicker.tsx`

### `lib/storyFilters/types.ts`

This file defines the story filter type contract.

It adds the five category ids:

```ts
export type StoryFilterCategory =
  | 'cute'
  | 'playful'
  | 'fancy'
  | 'food'
  | 'location';
```

It adds category display metadata:

```ts
export const STORY_CATEGORIES: StoryFilterCategoryMeta[] = [
  { id: 'cute', num: '01 / CUTE', title: 'Girls Night', subtitle: 'Pink, pearls, bows.' },
  { id: 'playful', num: '02 / PLAYFUL', title: 'Funny one-liners', subtitle: 'Tags & tickets.' },
  { id: 'fancy', num: '03 / FANCY', title: 'Date Night', subtitle: 'Gold, velvet, glow.' },
  { id: 'food', num: '04 / FOOD', title: 'By the dish', subtitle: 'Doodles & stamps.' },
  { id: 'location', num: '05 / LOCATION', title: 'Booked & Dined', subtitle: 'Pins & confirms.' },
];
```

It defines all valid filter ids through `StoryFilterId`. This gives TypeScript one official list of filter ids, so screens cannot accidentally pass an unknown filter string without being checked.

It defines the props every filter receives:

```ts
export type StoryFilterProps = {
  width: number;
  height: number;
  capturedAt?: number;
  restaurantName?: string;
  city?: string;
  area?: string;
};
```

Those props let filters scale responsively and let location filters display the selected restaurant details.

### `lib/storyFilters/registry.ts`

This is the single source of truth for the filters shown in Style your snap.

Every filter entry has:

- `id`
- `name`
- `shortLabel`
- `category`
- `watermark`
- `Component`

The carousel and screens use `STORY_FILTERS` from this file, so adding, removing, or reordering a filter happens in one place.

The registry also exports:

```ts
export function getStoryFilterById(id: StoryFilterId): StoryFilterEntry | null
```

and:

```ts
export function listStoryFilterIds(): StoryFilterId[]
```

`getStoryFilterById` is used by `StoryFilterFrame` to render the correct overlay component.

### Current Registered Filters

There are 30 registered filters. Brunch Club and Dinner Diaries were removed, and two restaurant-aware Booked & Dined filters were added so the total count stayed at 30.

Cute:

- `pink-bow-dinner`: Pink Bow Dinner
- `coquette-dinner`: Coquette Dinner
- `martini-girls-night`: Martini Girls Night
- `lip-gloss-night`: Lip Gloss Night
- `birthday-princess`: Birthday Princess
- `butterfly-glow`: Butterfly Glow

Playful:

- `no-crumbs-left`: No Crumbs Left
- `shes-expensive`: She's Expensive
- `main-character-meal`: Main Character Meal
- `pretty-food-only`: Pretty Food Only
- `dinner-was-the-plot`: Dinner Was the Plot
- `pov-best-table`: POV: Best Table

Fancy:

- `date-night-verified`: Date Night Verified
- `champagne-glow`: Champagne Glow
- `golden-hour-dinner`: Golden Hour Dinner
- `hidden-gem`: Hidden Gem
- `velvet-night`: Velvet Night
- `black-card-dinner`: Black Card Dinner

Food:

- `pasta-night`: Pasta Night
- `sushi-date`: Sushi Date
- `dessert-first`: Dessert First
- `pizza-date`: Pizza Date
- `cocktail-hour`: Cocktail Hour

Location:

- `dined-at-restaurant`: Dined at Restaurant
- `restaurant-location-stamp`: Restaurant Location Stamp
- `dined-in-toronto`: Dined in City
- `booked-on-cenaiva`: Booked on Cenaiva
- `table-for-two`: Table for Two
- `tonights-spot`: Tonight's Spot
- `best-seat-in-the-house`: Best Seat in the House

### `lib/storyFilters/fonts.ts`

The HTML reference used Google Fonts:

- Italiana
- Cormorant Garamond
- Pinyon Script
- Bodoni Moda
- Caveat
- DM Mono
- Inter

The app maps those to native platform font names instead of adding more font dependencies.

Examples:

- Italiana maps to `Didot` on iOS and `serif` elsewhere.
- Cormorant Garamond maps to `Times New Roman` on iOS and `serif` elsewhere.
- Pinyon Script and Caveat map to `Snell Roundhand` on iOS and `cursive` elsewhere.
- DM Mono maps to `Menlo` on iOS and `monospace` elsewhere.
- Inter maps to the default system sans font.

This keeps the visual style close to the reference without forcing a Google Font loading setup.

### `lib/storyFilters/previewLayout.ts`

This file fixes the photo-frame sizing problems across Style your snap, Add Caption, and Share.

It exports:

```ts
export const DEFAULT_SNAP_PHOTO_ASPECT = 3 / 4;
```

and:

```ts
export function getSnapPreviewLayout({
  photoAspect,
  maxWidth,
  maxHeight,
  minAspect = 0.75,
  maxAspect = 1.45,
}: PreviewLayoutInput): SnapPreviewLayout
```

What it does:

1. Normalizes invalid or missing photo aspect ratios back to `3 / 4`.
2. Clamps extreme image ratios between `0.45` and `1.8` internally.
3. Clamps the displayed preview ratio between `minAspect` and `maxAspect`.
4. Calculates a preview width and height that fit inside the available screen space.
5. Returns `{ width, height, aspect }`.

This was added because the photo preview was previously too tall and narrow, and users had to scroll down to see filters.

### `components/storyFilters/StoryFilterFrame.tsx`

This component is the shared frame that combines the user's photo with the chosen filter.

It accepts:

- `filterId`
- `photo`
- `photoSource`
- `width`
- `height`
- `mediaSlot`
- `capturedAt`
- `restaurantName`
- `city`
- `area`

The render order is:

1. User media.
2. Subtle grain.
3. Vignette.
4. The selected filter overlay.

The frame keeps:

- rounded corners
- dark fallback background
- hidden overflow
- absolute overlay positioning

If a screen passes `mediaSlot`, that custom media is rendered inside the frame. The snap screens use this so they can render `expo-image` with `contentFit="cover"` and `contentPosition="bottom"`.

If no filter is selected, `StoryFilterFrame` renders the photo with grain and vignette but no overlay component.

### `components/storyFilters/StoryWatermark.tsx`

Every filter uses the shared `StoryWatermark`.

It renders:

```tsx
by Cenaiva
```

The watermark can sit in:

- top-right: `position="tr"`
- bottom-left: `position="bl"`

The watermark was made bigger and bolder across all filters:

- `by` uses weight `700`
- `Cenaiva` uses weight `800`
- both use font size `12`
- opacity was raised to `rgba(255,255,255,0.82)`
- the text shadow remains so it is readable on bright photos

This replaced the smaller, lighter watermark style from the HTML reference.

### `components/storyFilters/glyphs.tsx`

This file centralizes reusable SVG shapes so filters do not duplicate path data.

It includes:

- `BowGlyph`
- `Pearl`
- `Ribbon`
- `MartiniGlyph`
- `CrownGlyph`
- `ButterflyGlyph`
- `Heart`
- `Sparkle`
- `ArrowSwoop`
- `PastaStrands`
- `SushiGlyph`
- `ChopsticksGlyph`
- `ClockGlyph`
- `PinGlyph`

These glyphs recreate the HTML reference shapes in React Native SVG.

### `components/storyFilters/StoryFilterPicker.tsx`

This is a reusable compact horizontal picker component.

It includes:

- an Original chip
- tiny preview chips
- active filter highlighting with a gold border
- tap selected filter again to clear it
- scaled preview rendering of the actual filter component

The current Style your snap screen uses its own category chips plus text filter chips, but this reusable picker remains available for any future compact carousel UI.

## Individual Filter Details

### Pink Bow Dinner

File:

- `components/storyFilters/filters/PinkBowDinner.tsx`

Details:

- Renders two bow SVGs.
- Adds a soft pink glow.
- Adds sparkle accents.
- Places the label `Pink Bow Dinner` near the bottom.
- Uses the top-right Cenaiva watermark.

### Coquette Dinner

File:

- `components/storyFilters/filters/CoquetteDinner.tsx`

Details:

- Renders a row of pearl beads.
- Adds a pink ribbon under the pearls.
- Adds small heart accents.
- Renders `Coquette` and `une belle soiree` styling from the reference.
- Uses the top-right Cenaiva watermark.

### Martini Girls Night

File:

- `components/storyFilters/filters/MartiniGirlsNight.tsx`

Details:

- Renders three martini doodle glyphs.
- Some martini glyphs include the pink cherry accent.
- Adds the `girls' night` badge at the bottom.
- Uses the top-right Cenaiva watermark.

### Lip Gloss Night

File:

- `components/storyFilters/filters/LipGlossNight.tsx`

Details:

- Renders a lipstick/kiss sticker-style accent.
- Renders the glossy `Lip Gloss Night` label.
- Keeps the small decorative sublabel styling.
- Uses the top-right Cenaiva watermark.

### Birthday Princess

File:

- `components/storyFilters/filters/BirthdayPrincess.tsx`

Details:

- Renders a gold crown glyph.
- Adds gold sparkle accents.
- Renders the birthday label.
- Uses the top-right Cenaiva watermark.

### Butterfly Glow

File:

- `components/storyFilters/filters/ButterflyGlow.tsx`

Details:

- Renders multiple butterfly glyphs.
- Uses pink and lilac butterfly colors.
- Adds soft edge light leaks.
- Renders the `Butterfly Glow` label.
- Uses the top-right Cenaiva watermark.

### No Crumbs Left

File:

- `components/storyFilters/filters/NoCrumbsLeft.tsx`

Details:

- Renders a handwritten `no crumbs left.` tag.
- Adds a pink curved arrow pointing toward the food.
- Uses the top-right Cenaiva watermark.

### She's Expensive

File:

- `components/storyFilters/filters/ShesExpensive.tsx`

Details:

- Renders a small price marker.
- Adds a black-and-gold badge.
- Uses the top-right Cenaiva watermark.

### Main Character Meal

File:

- `components/storyFilters/filters/MainCharacterMeal.tsx`

Details:

- Renders a ticket-style label.
- Includes the scene/take small text treatment.
- Renders `main character meal`.
- Uses the top-right Cenaiva watermark.

### Pretty Food Only

File:

- `components/storyFilters/filters/PrettyFoodOnly.tsx`

Details:

- Renders a pink pill label.
- Adds small heart details.
- Uses the bottom-left Cenaiva watermark to avoid collisions.

### Dinner Was the Plot

File:

- `components/storyFilters/filters/DinnerWasThePlot.tsx`

Details:

- Renders the script label `Dinner was the plot`.
- Keeps the chapter-style sublabel.
- Uses the top-right Cenaiva watermark.

### POV: Best Table

File:

- `components/storyFilters/filters/POVBestTable.tsx`

Details:

- Renders `POV:` in caps.
- Renders `best table.` in a softer italic style.
- Uses the bottom-left Cenaiva watermark.

### Date Night Verified

File:

- `components/storyFilters/filters/DateNightVerified.tsx`

Details:

- Renders a rounded verification pill.
- Includes the checkmark bubble.
- Uses the top-right Cenaiva watermark.

### Champagne Glow

File:

- `components/storyFilters/filters/ChampagneGlow.tsx`

Details:

- Adds a warm champagne edge glow.
- Renders bubble accents.
- Renders the champagne label.
- Uses the top-right Cenaiva watermark.

### Golden Hour Dinner

File:

- `components/storyFilters/filters/GoldenHourDinner.tsx`

Details:

- Keeps the warm amber edge vignette.
- Keeps the `Golden Hour Dinner` label.
- Removes the gold circle that used to sit near the middle of the screen.
- Uses an edge-only `LinearGradient` so the center stays clear.
- Uses the top-right Cenaiva watermark.

### Hidden Gem

File:

- `components/storyFilters/filters/HiddenGem.tsx`

Details:

- Renders a small gem-style label treatment.
- Uses the bottom-left Cenaiva watermark.

### Velvet Night

File:

- `components/storyFilters/filters/VelvetNight.tsx`

Details:

- Renders corner frame accents.
- Renders `Velvet Night`.
- Keeps the private-room sublabel style.
- Uses the top-right Cenaiva watermark.

### Black Card Dinner

File:

- `components/storyFilters/filters/BlackCardDinner.tsx`

Details:

- Renders a mini black-card sticker.
- Includes the Cenaiva wordmark on the card.
- Includes masked card digits.
- Uses the top-right Cenaiva watermark.

### Pasta Night

File:

- `components/storyFilters/filters/PastaNight.tsx`

Details:

- Renders the pasta-strand doodle.
- Renders `Pasta night`.
- Fixes the text typo so it says Pasta, not Basta.
- Keeps the `AL DENTE` sublabel.
- Uses the top-right Cenaiva watermark.

### Sushi Date

File:

- `components/storyFilters/filters/SushiDate.tsx`

Details:

- Renders a sushi glyph.
- Renders chopstick-style line accents.
- Adds a small heart.
- Renders the sushi date label.
- Uses the top-right Cenaiva watermark.

### Dessert First

File:

- `components/storyFilters/filters/DessertFirst.tsx`

Details:

- Renders only the `DESSERT FIRST` stamp.
- Removes the spoon from the middle of the screen.
- Uses the top-right Cenaiva watermark.

### Pizza Date

File:

- `components/storyFilters/filters/PizzaDate.tsx`

Details:

- Renders the slice-night ticket.
- Renders `Pizza Date`.
- Removes the two red pizza dots from the middle of the screen.
- Uses the top-right Cenaiva watermark.

### Cocktail Hour

File:

- `components/storyFilters/filters/CocktailHour.tsx`

Details:

- Renders a clock glyph.
- Shows the time from the photo capture timestamp.
- Formats the timestamp using `Intl.DateTimeFormat`.
- Uses the `America/Toronto` timezone.
- Appends `EST` to the formatted time because the requested display copy was EST.
- Falls back to local time formatting if `Intl.DateTimeFormat` throws.
- Keeps the `Cocktail Hour` and `APERITIF` label treatment.
- Uses the top-right Cenaiva watermark.

Relevant code:

```ts
const time = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(date);
return `${time} EST`;
```

### Dined at Restaurant

File:

- `components/storyFilters/filters/DinedAtRestaurant.tsx`

Details:

- Added for the Booked & Dined category.
- Displays the selected restaurant name.
- Uses a location pin glyph.
- Shows an eyebrow reading `Dined at`.
- Falls back to `This spot` if no restaurant name is passed.
- Uses the top-right Cenaiva watermark.

### Restaurant Location Stamp

File:

- `components/storyFilters/filters/RestaurantLocationStamp.tsx`

Details:

- Added for the Booked & Dined category.
- Displays `WHERE WE DINED`.
- Displays the selected restaurant name.
- Displays area and city when available.
- Falls back to `Dinner spot` and `Booked & Dined` if data is missing.
- Uses a dashed paper-ticket style.
- Uses the top-right Cenaiva watermark.

### Dined in City

File:

- `components/storyFilters/filters/DinedInToronto.tsx`

Details:

- Keeps the original Toronto-style visual treatment.
- Registry display name is now `Dined in City`.
- Receives `city` from the selected restaurant data.
- Uses the top-right Cenaiva watermark.

### Booked on Cenaiva

File:

- `components/storyFilters/filters/BookedOnCenaiva.tsx`

Details:

- Renders a glassy confirmation pill.
- Includes a checkmark bubble.
- Renders `Booked on Cenaiva`.
- Uses the top-right Cenaiva watermark.

### Table for Two

File:

- `components/storyFilters/filters/TableForTwo.tsx`

Details:

- Renders the editorial `Table for Two` label.
- Keeps the reserved sublabel.
- Uses the top-right Cenaiva watermark.

### Tonight's Spot

File:

- `components/storyFilters/filters/TonightsSpot.tsx`

Details:

- Renders a gold star.
- Renders `Tonight's Spot`.
- Keeps a confirmed-time style label.
- Uses the top-right Cenaiva watermark.

### Best Seat in the House

File:

- `components/storyFilters/filters/BestSeatInTheHouse.tsx`

Details:

- Renders the `best seat in the house` badge.
- Renders the downward arrow.
- Uses the bottom-left Cenaiva watermark.

## Removed Filters

The following filters were removed from the active registry:

- Brunch Club
- Dinner Diaries

Their ids are not part of the current `StoryFilterId` union and they are not registered in `STORY_FILTERS`.

## Camera Screen Changes

File changed:

- `app/(customer)/discover/post-review/camera.tsx`

### Capture Timestamp

The screen now tracks the capture timestamp in state:

- `selectedCapturedAt`

For gallery images, the app requests EXIF data from Image Picker:

```ts
exif: true
```

It reads possible EXIF date fields through `readExifTimestamp`.

The function checks:

- `DateTimeOriginal`
- `DateTimeDigitized`
- `DateTime`
- `CreationDate`

It normalizes EXIF dates from `YYYY:MM:DD HH:mm:ss` shape into parseable date strings.

If EXIF does not exist or cannot be parsed, it falls back to `Date.now()`.

### Camera Capture

The camera capture call now uses:

```ts
const photo = await cameraRef.current.takePictureAsync({
  quality: 1,
  skipProcessing: true,
  exif: true,
});
```

`quality: 1` keeps the photo quality high.

`skipProcessing: true` avoids Expo Camera applying extra image processing that could change the photo after capture.

`exif: true` preserves orientation and timestamp metadata.

### Routing to Style your snap

After the user taps Next, the camera screen routes straight to:

```txt
/(customer)/discover/post-review/styles
```

It sends:

- `photoUri`
- `restaurantId`
- `capturedAt`

This bypasses the older standalone preview step because the requested flow is camera or photo picker directly into Style your snap.

## Style Your Snap Screen Changes

File changed:

- `app/(customer)/discover/post-review/styles.tsx`

### Screen Positioning

The title `Style your snap` was moved up so the top of the screen no longer has a large empty black gap.

The Continue button was placed in a fixed footer instead of floating too high. The footer uses the screen bottom more naturally and keeps the button visible after the user chooses filters.

### Photo Preview Sizing

The screen uses `getSnapPreviewLayout` to calculate the preview size.

Inputs include:

- actual photo aspect from `expo-image` load events
- screen width
- screen height
- safe-area top
- safe-area bottom

The preview no longer stays in a very tall 9:16 frame by default. It uses a balanced frame that lets the user clearly see the photo and still see the filter section without excessive scrolling.

### Photo Rendering

The screen uses `expo-image` instead of React Native `Image` for the photo.

Reason:

- `expo-image` handles EXIF orientation more reliably.
- It fixed the issue where a photo could rotate incorrectly after capture.

The image inside the frame uses:

```tsx
contentFit="cover"
contentPosition="bottom"
```

This keeps the frame visually full while preserving the bottom of the photo, which fixed the issue where the bottom of the user's photo was being cut off.

### Filter State

The screen stores:

- selected category: `categoryId`
- selected filter: `filterId`
- photo aspect ratio: `photoAspect`
- capture state: `busy`

The first category defaults to:

```ts
const [categoryId, setCategoryId] = useState<StoryFilterCategory>('cute');
```

The filter starts as:

```ts
const [filterId, setFilterId] = useState<StoryFilterId | null>(null);
```

### Restaurant Details

The style screen looks up the selected restaurant from `mockRestaurants`.

It passes these values into `StoryFilterFrame`:

- `restaurantName`
- `city`
- `area`

This lets Booked & Dined filters show where the user dined.

Fallbacks:

- restaurant name falls back to `getSnapRestaurantName(restaurantId)`
- city falls back to `Toronto`
- area falls back to city

### Category Picker

The filter UI now uses category chips from `STORY_CATEGORIES`.

The categories are:

- Girls Night
- Funny one-liners
- Date Night
- By the dish
- Booked & Dined

When a category is selected, the visible filter list is:

```ts
STORY_FILTERS.filter((filter) => filter.category === categoryId)
```

### Filter Picker

The filter row includes:

- `Original`
- the filters for the selected category

Tapping Original sets:

```ts
setFilterId(null)
```

Tapping a filter sets:

```ts
setFilterId(o.id)
```

### Continue Behavior

If there is no filter selected, Continue sends the original photo forward.

If a filter is selected, the screen tries to capture the composed view:

```ts
const uri = await captureStyledSnapToTmpFile(captureRefView);
```

If native view capture works, the next screen receives the baked image URI.

If native view capture is not available, the next screen receives:

- original photo URI
- `filterId`
- `capturedAt`

This was important because Expo Go cannot always bake stickers onto the image. Instead of losing the filter, the app now keeps filter metadata and re-renders the filter on later screens.

## Add Caption Screen Changes

File changed:

- `app/(customer)/discover/post-review/connect.tsx`

### Filter Metadata Parsing

The caption screen now accepts:

- `photoUri`
- `restaurantId`
- `filterId`
- `capturedAt`

It validates the filter id by checking it exists in `STORY_FILTERS`.

Invalid filter ids become `null` and do not crash the screen.

### Same Frame as Style your snap

The Add Caption screen now uses the same preview layout helper as Style your snap:

```ts
getSnapPreviewLayout(...)
```

This fixed the issue where Add Caption returned to the old long/narrow frame when no filter was selected.

### Filter Preview

If a filter is selected, the screen renders:

```tsx
<StoryFilterFrame
  filterId={selectedFilterId}
  width={photoW}
  height={photoH}
  capturedAt={capturedAt}
  restaurantName={selectedRestaurantName}
  city={selectedRestaurantCity}
  area={selectedRestaurantArea}
  mediaSlot={...}
/>
```

If no filter is selected, it still uses the same frame dimensions and renders the photo directly.

Both paths use:

```tsx
contentFit="cover"
contentPosition="bottom"
```

That keeps the visual frame consistent whether the user picked a filter or not.

### Post Data

When the user posts, the mock snap stores:

```ts
storyFilterId: selectedFilterId ?? undefined
storyFilterCapturedAt: selectedFilterId ? capturedAt : undefined
```

This means feed/profile data can keep track of which filter was used.

### Reward Route

When the user taps Post, the screen routes to:

```txt
/(customer)/discover/post-review/reward
```

It sends:

- `points`
- `restaurantName`
- `restaurantId`
- `photoUri`
- `rating`
- `filterId` when a filter exists
- `capturedAt` when a filter exists

This fixed the issue where the reward screen showed the photo but dropped the selected filter.

## Reward Screen Changes

File changed:

- `app/(customer)/discover/post-review/reward.tsx`

### Filter Metadata Parsing

The reward screen now reads:

- `filterId`
- `capturedAt`

It validates `filterId` against `STORY_FILTERS` before using it.

### Restaurant Metadata

The screen looks up the selected restaurant by `restaurantId` from `mockRestaurants`.

It passes these props into `SnapShareSheet`:

- `restaurantName`
- `city`
- `area`

That keeps restaurant-aware filters correct on the final reward/share screen.

### Auto-Save

The reward screen now renders `SnapShareSheet` with:

```tsx
autoSaveToCameraRoll
```

This lets the app attempt an automatic camera-roll save after the reward screen loads.

## Snap Share Sheet Changes

File changed:

- `components/snaps/SnapShareSheet.tsx`

### New Props

The share sheet accepts:

```ts
storyFilterId?: StoryFilterId | null;
storyFilterCapturedAt?: number;
restaurantName?: string;
city?: string;
area?: string;
autoSaveToCameraRoll?: boolean;
```

### Filter Preview

When `storyFilterId` exists and the media type is `photo`, the share sheet renders the preview through `StoryFilterFrame`.

It passes:

- filter id
- capture timestamp
- restaurant name
- city
- area
- the photo as a custom `mediaSlot`

If there is no filter, it renders the photo directly with the same preview layout.

### Preview Sizing

The share sheet also uses `getSnapPreviewLayout`.

It caps the preview width and height so the reward card looks balanced:

- max width is based on screen width, capped near `340`
- max height is based on screen height, capped near `380`

### Save to Camera Roll Button

The share sheet now has a visible button:

```txt
Save to your camera roll
```

States:

- loading spinner while saving
- disabled while already saved
- disabled while filtered preview is still loading
- check icon after save
- `Saved to camera roll` when the filtered or prepared media saved
- `Saved photo to camera roll` when it had to fall back to the original photo

### Save Logic

The save flow is:

1. If there is a story filter, wait until the preview image is loaded.
2. Try to capture the filtered view with `captureStyledSnapToTmpFile`.
3. If capture works, save the captured filtered image.
4. If capture fails and a filter was required, try the general export path as fallback.
5. Save through `saveMediaToCameraRoll`.
6. Show the right success or error copy.

The function that does this is:

```ts
saveCurrentSnapToCameraRoll
```

### Auto Save

When `autoSaveToCameraRoll` is true:

1. The sheet waits for a valid photo.
2. If a filter exists, it waits for the preview to be ready.
3. It delays slightly for filtered snaps.
4. It calls `saveCurrentSnapToCameraRoll({ silent: true })`.

The auto-save guard uses:

```ts
autoSaveAttemptedRef
```

That prevents repeated saves when React re-renders the reward screen.

### Native Sharing Behavior

The share sheet still supports:

- Instagram Story
- Instagram Feed
- Snapchat
- TikTok
- YouTube for video

Personal Snapchat and TikTok app buttons open the user's installed app.

Native Instagram and YouTube sharing still require the native sharing module to be included in the build.

The helper text was simplified to:

```txt
Save it to your camera roll, then share the moment.
```

The old explanatory copy about choosing Instagram/opening Snapchat was removed.

## Camera Roll Support

Files changed:

- `package.json`
- `package-lock.json`
- `app.json`
- `lib/storage/cameraRoll.ts`

### Dependency

Added dependency:

```json
"expo-media-library": "~55.0.15"
```

### Expo Plugin

Added the Expo Media Library plugin in `app.json`.

The project already had plugins such as `expo-camera` and `expo-image-picker`; `expo-media-library` was added to support saving to the device camera roll.

### `lib/storage/cameraRoll.ts`

This file exports:

```ts
export async function saveMediaToCameraRoll(localUri: string): Promise<boolean>
```

It uses `requireOptionalNativeModule('ExpoMediaLibrary')` before importing `expo-media-library`.

Reason:

- Expo Go and some dev environments may not include the native media library module.
- Static importing can fail or make save unavailable in builds that do not include the module.
- Dynamic import allows the app to fail gracefully.

The save function:

1. Returns false if `localUri` is empty.
2. Checks whether the native module exists.
3. Dynamically imports `expo-media-library`.
4. Checks `isAvailableAsync` when available.
5. Checks current permissions with `getPermissionsAsync(true)`.
6. Requests write-only permission with `requestPermissionsAsync(true)` if needed.
7. Calls `saveToLibraryAsync(localUri)`.
8. Falls back to `createAssetAsync(localUri)` if `saveToLibraryAsync` fails and `createAssetAsync` exists.
9. Returns true only when the save succeeds.
10. Returns false instead of crashing when anything is unavailable.

## Native Filter Capture

File changed:

- `lib/snapOverlays/captureStyledSnap.ts`

This helper captures a React Native view to a temporary JPEG.

It exports:

```ts
export async function captureStyledSnapToTmpFile(
  viewRef: RefObject<View | null>,
): Promise<string | undefined>
```

### Expo Go Guard

The helper now checks:

```ts
Constants.appOwnership === 'expo'
```

If the app is running in Expo Go, it returns `undefined` instead of trying to use native view-shot.

Reason:

- Expo Go does not include every native module.
- Trying to capture with a missing native module can cause runtime errors.

### Native Module Guard

The helper checks:

- `TurboModuleRegistry.get?.('RNViewShot')`
- `NativeModules.RNViewShot`

If neither exists, capture is skipped.

### Dynamic Import

The helper dynamically imports:

```ts
const { captureRef } = await import('react-native-view-shot');
```

This avoids crashing app startup when the native module is missing.

### Capture Settings

It captures with:

```ts
{
  format: 'jpg',
  quality: 0.92,
  result: 'tmpfile',
}
```

It returns the captured URI if successful, or `undefined` if capture fails.

## Mock Snap Data Changes

File changed:

- `lib/mock/snaps.ts`

The `SnapPost` type now includes:

```ts
storyFilterId?: StoryFilterId;
storyFilterCapturedAt?: number;
```

The Add Caption screen writes those fields when the user posts with a selected filter.

This makes filter data part of the mock snap model instead of only temporary route params.

## Photo Frame and Cropping Fixes

The frame/cropping work happened across:

- `app/(customer)/discover/post-review/styles.tsx`
- `app/(customer)/discover/post-review/connect.tsx`
- `components/snaps/SnapShareSheet.tsx`
- `lib/storyFilters/previewLayout.ts`

Problems fixed:

- photo looked too vertical
- photo was too long and narrow
- left/right black space confused the overlay placement
- filters appeared to overlap black bars
- bottom of the photo was being cut off
- Add Caption used a different frame than Style your snap
- no-filter caption flow returned to the old frame
- reward/share screen dropped the filter

Current behavior:

- all three major preview surfaces use the same layout helper
- all image previews read the actual photo dimensions from `expo-image`
- the displayed aspect is clamped to a usable range
- photo content fills the frame with `cover`
- photo content is anchored to the bottom with `contentPosition="bottom"`
- filters render inside the same visible frame as the photo

## Expo Go Limitation

In Expo Go, the app cannot always flatten filters onto photos because Expo Go may not include the native `react-native-view-shot` module or the native media-library module.

The current behavior is:

- The filter remains visible in the app because metadata is preserved.
- Saving or native sharing tries to capture the filtered preview.
- If capture is unavailable, the app can save the original photo as a fallback.
- A Cenaiva development build is required to reliably bake the filter onto the saved image.

This is why the code avoids crashing and keeps filter metadata as a fallback path.

## Files Created

Created story filter core:

- `lib/storyFilters/types.ts`
- `lib/storyFilters/registry.ts`
- `lib/storyFilters/fonts.ts`
- `lib/storyFilters/previewLayout.ts`
- `components/storyFilters/StoryFilterFrame.tsx`
- `components/storyFilters/StoryWatermark.tsx`
- `components/storyFilters/glyphs.tsx`
- `components/storyFilters/StoryFilterPicker.tsx`

Created filter components:

- `components/storyFilters/filters/PinkBowDinner.tsx`
- `components/storyFilters/filters/CoquetteDinner.tsx`
- `components/storyFilters/filters/MartiniGirlsNight.tsx`
- `components/storyFilters/filters/LipGlossNight.tsx`
- `components/storyFilters/filters/BirthdayPrincess.tsx`
- `components/storyFilters/filters/ButterflyGlow.tsx`
- `components/storyFilters/filters/NoCrumbsLeft.tsx`
- `components/storyFilters/filters/ShesExpensive.tsx`
- `components/storyFilters/filters/MainCharacterMeal.tsx`
- `components/storyFilters/filters/PrettyFoodOnly.tsx`
- `components/storyFilters/filters/DinnerWasThePlot.tsx`
- `components/storyFilters/filters/POVBestTable.tsx`
- `components/storyFilters/filters/DateNightVerified.tsx`
- `components/storyFilters/filters/ChampagneGlow.tsx`
- `components/storyFilters/filters/GoldenHourDinner.tsx`
- `components/storyFilters/filters/HiddenGem.tsx`
- `components/storyFilters/filters/VelvetNight.tsx`
- `components/storyFilters/filters/BlackCardDinner.tsx`
- `components/storyFilters/filters/PastaNight.tsx`
- `components/storyFilters/filters/SushiDate.tsx`
- `components/storyFilters/filters/DessertFirst.tsx`
- `components/storyFilters/filters/PizzaDate.tsx`
- `components/storyFilters/filters/CocktailHour.tsx`
- `components/storyFilters/filters/DinedAtRestaurant.tsx`
- `components/storyFilters/filters/RestaurantLocationStamp.tsx`
- `components/storyFilters/filters/DinedInToronto.tsx`
- `components/storyFilters/filters/BookedOnCenaiva.tsx`
- `components/storyFilters/filters/TableForTwo.tsx`
- `components/storyFilters/filters/TonightsSpot.tsx`
- `components/storyFilters/filters/BestSeatInTheHouse.tsx`

Created storage helper:

- `lib/storage/cameraRoll.ts`

Created this documentation:

- `docs/cenaiva-snap-filters-worklog.md`

## Files Modified

Modified navigation:

- `app/(customer)/_layout.tsx`

Modified snap flow screens:

- `app/(customer)/discover/post-review/camera.tsx`
- `app/(customer)/discover/post-review/styles.tsx`
- `app/(customer)/discover/post-review/connect.tsx`
- `app/(customer)/discover/post-review/reward.tsx`

Modified snap sharing:

- `components/snaps/SnapShareSheet.tsx`

Modified snap data model:

- `lib/mock/snaps.ts`

Modified capture helper:

- `lib/snapOverlays/captureStyledSnap.ts`

Modified Expo/package configuration:

- `app.json`
- `package.json`
- `package-lock.json`

Removed old overlay files:

- `components/snapOverlays/SnapOverlayLayer.tsx`
- `lib/snapOverlays/catalog.ts`
- `lib/snapOverlays/types.ts`

## Verification

The project typecheck was run after the snap-flow and save changes:

```txt
npm run typecheck
```

The typecheck passed after the implementation fixes, the final center-tab icon change, and this documentation file.

## Important Runtime Notes

1. The selected filter is preserved through route params when the app cannot bake it into the photo.
2. A baked filtered image requires native view capture.
3. Camera-roll saving requires `expo-media-library` in the installed build.
4. Expo Go may show fallback behavior because it does not include every native module.
5. The Booked & Dined filters depend on `restaurantId` and `mockRestaurants` for restaurant name, city, and area.
6. The Cocktail Hour filter depends on `capturedAt`, which comes from EXIF when available or `Date.now()` otherwise.
7. The final in-app preview is designed to show the selected filter even when the saved file is only the original photo fallback.
