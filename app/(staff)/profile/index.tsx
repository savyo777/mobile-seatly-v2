import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { safeOwnerPush } from '@/lib/navigation/safeOwnerNavigation';
import { withOwnerReturnTarget } from '@/lib/navigation/ownerReturnTargets';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import { useMenu } from '@/lib/context/MenuContext';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
// Mock fallbacks (OWNER_BUSINESS_PROFILE / OWNER_RESERVATIONS / mockRestaurants)
// were removed from the business header — that surface now renders real DB
// data only. DEMO_listSnapPostsByRestaurant is still used by the Photos
// section's demo-mode preview below.
import { listSnapPostsByRestaurant as DEMO_listSnapPostsByRestaurant } from '@/lib/mock/snaps';
import {
  fetchRestaurantVisitPhotos,
  type RestaurantVisitPhoto,
} from '@/lib/owner/visitPhotos';

type GalleryPhoto = { id: string; image: string };

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  // ── Hero ──
  heroWrap: {
    overflow: 'hidden',
  },
  heroCover: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  heroContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    // Fully opaque so the cover photo behind the hero doesn't bleed
    // through transparent areas of the logo image.
    backgroundColor: c.bgBase,
    borderWidth: 1.5,
    borderColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  logoImage: { width: '100%', height: '100%' },
  logoLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.5,
  },
  heroTextCol: {
    flex: 1,
    paddingBottom: 4,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  heroMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  heroMetaDot: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  heroMetaPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMetaChevron: {
    marginLeft: 2,
    opacity: 0.85,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  addressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },

  // ── Buttons ──
  heroButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  previewBtn: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  editBtn: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  btnPressed: { opacity: 0.82 },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
  },
  statValueGold: { color: c.gold },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Section ──
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '700',
    color: c.gold,
  },

  // ── Photos ──
  photoSubtitle: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '400',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: -4,
  },
  photosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  photoThumb: {
    flex: 1,
    height: 90,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },

  // ── About / content ──
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: c.textSecondary,
    fontWeight: '400',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },

  // ── Contact / settings card ──
  listCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  listRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  listRowPressed: { backgroundColor: c.bgElevated },
  listLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textMuted,
    width: 100,
    flexShrink: 0,
  },
  listValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    textAlign: 'right',
    paddingRight: spacing.sm,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  settingsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textMuted,
    marginRight: spacing.sm,
  },

  // ── Menu ──
  manageAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: c.gold,
  },
  menuCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  menuSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  menuSummaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${c.gold}18`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.gold}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSummaryText: { flex: 1 },
  menuSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  menuSummarySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    marginTop: 2,
  },
  menuActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: c.bgSurface,
  },
  menuActionPressed: { opacity: 0.86 },
  menuActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.gold,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  menuActionBody: {
    flex: 1,
    minWidth: 0,
  },
  menuActionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  menuActionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.25,
  },
  menuActionSub: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
    marginTop: 3,
  },
  menuActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.gold}55`,
  },
  menuActionPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.gold,
  },

  // ── Settings shortcut ──
  settingsBtn: {
    position: 'absolute',
    top: 0,
    right: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${c.bgSurface}CC`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

}));



export default function OwnerBusinessScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const heroH = 220 + insets.top;
  const { selectedRestaurant, isAll } = useOwnerScope();
  const ownerRestaurant = selectedRestaurant;

  const { items: menuItems } = useMenu();

  // Restaurant gallery photos for the "Photos" section. In demo mode we
  // continue to surface the mock snaps; in production we read from the
  // `visit_photos` table (rows posted by diners against a reservation).
  const [visitPhotos, setVisitPhotos] = useState<RestaurantVisitPhoto[]>([]);
  useEffect(() => {
    if (isDemoModeEnabled()) {
      setVisitPhotos([]);
      return;
    }
    const restaurantId = ownerRestaurant?.id;
    if (!restaurantId) {
      setVisitPhotos([]);
      return;
    }
    let active = true;
    void fetchRestaurantVisitPhotos(restaurantId, 3).then((rows) => {
      if (active) setVisitPhotos(rows);
    });
    return () => {
      active = false;
    };
  }, [ownerRestaurant?.id]);

  const galleryPhotos: GalleryPhoto[] = isDemoModeEnabled()
    ? ownerRestaurant?.id
      ? DEMO_listSnapPostsByRestaurant(ownerRestaurant.id)
          .slice(0, 3)
          .map((snap) => ({ id: snap.id, image: snap.image }))
      : []
    : visitPhotos.map((photo) => ({ id: photo.id, image: photo.imageUrl }));

  const menuByCategory = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Business view reads from the live `restaurants` row only. No mock
  // fallbacks — if a field is missing the UI shows an empty state. This
  // is the surface the user actually evaluates the app on, so seeing
  // placeholder data here ("4.8 / 512 reviews / Nova Ristorante") was
  // misleading. Demo content stays in place on other staff screens.
  const coverPhotoUrl = ownerRestaurant?.coverPhotoUrl ?? null;
  const profileName = ownerRestaurant?.name ?? 'Your restaurant';
  const logoUrl = ownerRestaurant?.logoUrl ?? null;
  const profileAddress = ownerRestaurant?.address ?? '';
  const profileRating = ownerRestaurant?.rating ?? null;
  const profileReviewCount = ownerRestaurant?.reviewCount ?? null;
  const profileCuisine = ownerRestaurant?.cuisine ?? '';

  // Real bookings stats will come from an /owner/stats/bookings endpoint
  // that aggregates the `reservations` table. Until that ships, render 0
  // — never the prior demo-derived numbers.
  const todayBookings = 0;
  const thisWeekBookings = 0;
  const avgRating = profileRating ?? 0;

  const contactRows: { label: string; value: string }[] = [
    { label: 'Phone', value: ownerRestaurant?.phone ?? '' },
    { label: 'Email', value: ownerRestaurant?.email ?? '' },
    { label: 'Website', value: ownerRestaurant?.website ?? '' },
  ].filter((row) => row.value);

  const billingLabel = ownerRestaurant?.billingCardLast4
    ? `${ownerRestaurant.billingCardBrand ?? 'Card'} ···· ${ownerRestaurant.billingCardLast4}`
    : 'No card on file';

  const settingsRows: { label: string; value: string; route?: string }[] = [
    { label: 'Payout & billing', value: billingLabel, route: '/(staff)/settings' },
    {
      label: 'Notifications',
      value: 'Push + email',
      route: withOwnerReturnTarget('/(staff)/notifications', 'business'),
    },
    { label: 'Close restaurant', value: 'Not scheduled' },
    { label: 'Help & support', value: '' },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPad }}
      >
        {/* ── Hero with diagonal stripe ── */}
        <View style={[styles.heroWrap, { height: heroH }]}>
          {coverPhotoUrl ? (
            <Image source={{ uri: coverPhotoUrl }} style={styles.heroCover} resizeMode="cover" />
          ) : null}
          <View style={styles.heroOverlay} />
          <Pressable
            style={({ pressed }) => [
              styles.settingsBtn,
              { top: insets.top + spacing.sm },
              pressed && styles.btnPressed,
            ]}
            onPress={() => router.push('/(staff)/settings' as never)}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            testID="staff-business-settings-gear"
          >
            <Ionicons name="settings-outline" size={18} color={c.textSecondary} />
          </Pressable>
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xs }]}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.logoLetter}>
                    {profileName.charAt(0)}
                  </Text>
                )}
              </View>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroKicker}>BUSINESS PROFILE</Text>
                <Text style={styles.heroTitle}>{profileName}</Text>
              </View>
            </View>
            {/*
              Rating pill. The star + rating + review-count portion is
              tappable when there's at least one review — it deep-links
              into the All Reviews screen at app/(staff)/reviews.tsx.
              Zero-review case stays static (no chevron, no press) so we
              don't open an empty list.
            */}
            <View style={styles.heroMeta}>
              {(profileReviewCount ?? 0) > 0 && ownerRestaurant?.id ? (
                <Pressable
                  style={({ pressed }) => [styles.heroMetaPressable, pressed && styles.btnPressed]}
                  onPress={() => router.push(`/(staff)/reviews?restaurantId=${ownerRestaurant.id}` as never)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${profileReviewCount} reviews`}
                >
                  <Ionicons name="star" size={13} color={c.gold} />
                  <Text style={styles.heroMetaText}>{avgRating ? avgRating.toFixed(1) : 'New'}</Text>
                  <Text style={styles.heroMetaDot}>·</Text>
                  <Text style={styles.heroMetaText}>{profileReviewCount ?? 0} reviews</Text>
                  <Ionicons name="chevron-forward" size={12} color={c.textMuted} style={styles.heroMetaChevron} />
                </Pressable>
              ) : (
                <View style={styles.heroMetaPressable}>
                  <Ionicons name="star" size={13} color={c.gold} />
                  <Text style={styles.heroMetaText}>{avgRating ? avgRating.toFixed(1) : 'New'}</Text>
                  <Text style={styles.heroMetaDot}>·</Text>
                  <Text style={styles.heroMetaText}>{profileReviewCount ?? 0} reviews</Text>
                </View>
              )}
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>{profileCuisine || 'Restaurant'}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color={c.textMuted} />
              <Text style={styles.addressText}>{profileAddress || 'No address on file'}</Text>
            </View>
            <View style={styles.heroButtons}>
              <Pressable
                style={({ pressed }) => [styles.previewBtn, pressed && styles.btnPressed]}
                onPress={() => ownerRestaurant?.id && router.push(`/(customer)/discover/${ownerRestaurant.id}?preview=1` as never)}
                accessibilityRole="button"
              >
                <Text style={styles.previewBtnText}>Preview</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
                onPress={() => router.push('/(staff)/profile/edit' as never)}
                accessibilityRole="button"
              >
                <Text style={styles.editBtnText}>Edit profile</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Restaurant picker ── */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <RestaurantPicker allowAll={false} size="compact" />
        </View>

        {isAll ? (
          <View style={{ padding: spacing.lg, alignItems: 'center' }}>
            <Text style={{ color: c.textMuted, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
              Pick a restaurant to manage its business profile.
            </Text>
          </View>
        ) : null}

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, styles.statValueGold]}>{todayBookings}</Text>
            <Text style={styles.statLabel}>Tonight</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{thisWeekBookings}</Text>
            <Text style={styles.statLabel}>This week</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg rating</Text>
          </View>
        </View>

        {/* ── Photos ── */}
        {galleryPhotos.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <Pressable
                onPress={() => ownerRestaurant?.id && router.push(`/(customer)/discover/snaps/${ownerRestaurant.id}` as never)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.sectionAction}>See all</Text>
              </Pressable>
            </View>
            <Text style={styles.photoSubtitle}>Real moments from your guests</Text>
            <View style={styles.photosRow}>
              {galleryPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoThumb}>
                  <Image source={{ uri: photo.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── About ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>About</Text>
          <Pressable
            onPress={() => router.push('/(staff)/profile/edit' as never)}
            accessibilityRole="button"
          >
            <Text style={styles.sectionAction}>Edit</Text>
          </Pressable>
        </View>
        <Text style={styles.bodyText}>{ownerRestaurant?.description || 'No restaurant description on file yet.'}</Text>

        {/* ── Contact ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Contact</Text>
        </View>
        <View style={styles.listCard}>
          {contactRows.map((row, i) => (
            <Pressable
              key={row.label}
              style={({ pressed }) => [
                styles.listRow,
                i > 0 && styles.listRowDivider,
                pressed && styles.listRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${row.label}: ${row.value}`}
            >
              <Text style={styles.listLabel}>{row.label}</Text>
              <Text style={styles.listValue} numberOfLines={1}>{row.value}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* ── Settings ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Settings</Text>
        </View>
        <View style={styles.listCard}>
          {settingsRows.map((row, i) => (
            <Pressable
              key={row.label}
              style={({ pressed }) => [
                styles.listRow,
                i > 0 && styles.listRowDivider,
                pressed && styles.listRowPressed,
              ]}
              onPress={() => row.route && safeOwnerPush(router, row.route as never)}
              accessibilityRole="button"
            >
              <Text style={styles.settingsLabel}>{row.label}</Text>
              {row.value ? <Text style={styles.settingsValue}>{row.value}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
