import React from 'react';
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
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import { useMenu } from '@/lib/context/MenuContext';
import {
  OWNER_BUSINESS_PROFILE,
  OWNER_BUSINESS_PRICE,
  OWNER_BUSINESS_INSTAGRAM,
  OWNER_RESERVATIONS,
} from '@/lib/mock/ownerApp';
import { mockRestaurants } from '@/lib/mock/restaurants';

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
    backgroundColor: `${c.bgBase}CC`,
    borderWidth: 1.5,
    borderColor: `${c.gold}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  menuGrid: {
    flexDirection: 'row',
    padding: spacing.sm,
  },
  menuGridDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: spacing.sm,
  },
  menuGridTile: {
    flex: 1,
    padding: spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  menuGridTilePressed: { opacity: 0.8 },
  menuGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  menuGridLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  menuGridSub: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMuted,
  },
  menu86Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  menu86RowPressed: { opacity: 0.8 },
  menu86Badge: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  menu86BadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  menu86Name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
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

  // ── Sign out ──
  signOutWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  signOut: {
    fontSize: 16,
    fontWeight: '700',
    color: c.danger,
    letterSpacing: -0.1,
  },
}));


function PhotoPlaceholder({ index }: { index: number }) {
  const c = useColors();
  const patterns = [
    { bg1: '#2A2000', bg2: '#3A3000', rotation: '45' },
    { bg1: '#001020', bg2: '#001835', rotation: '-30' },
    { bg1: '#200010', bg2: '#300018', rotation: '60' },
  ];
  const p = patterns[index % patterns.length];
  return (
    <Svg width="100%" height="90" viewBox="0 0 120 90">
      <Defs>
        <Pattern id={`ph${index}`} x={0} y={0} width={20} height={20} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={20} height={20} fill={p.bg1} />
          <Line x1={-2} y1={22} x2={22} y2={-2} stroke={p.bg2} strokeWidth={8} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={120} height={90} fill={`url(#ph${index})`} />
    </Svg>
  );
}

export default function OwnerBusinessScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const heroH = 220 + insets.top;

  const { items: menuItems, photos: photoUris, setPhotos } = useMenu();

  const menuByCategory = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const coverPhotoUrl = mockRestaurants.find((r) => r.id === 'r1')?.coverPhotoUrl;

  const pickPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      const next = [...photoUris];
      next[index] = result.assets[0].uri;
      setPhotos(next);
    }
  };

  const addPhoto = async () => {
    const emptyIndex = photoUris.findIndex((u) => !u);
    const targetIndex = emptyIndex === -1 ? photoUris.length : emptyIndex;
    if (targetIndex >= 3) {
      setPhotos([]);
      return;
    }
    await pickPhoto(targetIndex);
  };

  const todayBookings = OWNER_RESERVATIONS.length;
  const thisWeekBookings = 198;
  const avgRating = OWNER_BUSINESS_PROFILE.rating;

  const contactRows: { label: string; value: string }[] = [
    { label: 'Phone', value: OWNER_BUSINESS_PROFILE.phone },
    { label: 'Email', value: OWNER_BUSINESS_PROFILE.email },
    { label: 'Website', value: OWNER_BUSINESS_PROFILE.website },
  ];

  const settingsRows: { label: string; value: string; route?: string }[] = [
    { label: 'Payout & billing', value: 'Stripe · ···· 4429', route: '/(staff)/settings' },
    { label: 'Team access', value: '5 members', route: '/(staff)/settings' },
    { label: 'Notifications', value: 'Push + email', route: '/(staff)/notifications' },
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
          >
            <Ionicons name="settings-outline" size={18} color={c.textSecondary} />
          </Pressable>
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xs }]}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoLetter}>
                  {OWNER_BUSINESS_PROFILE.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroKicker}>BUSINESS PROFILE</Text>
                <Text style={styles.heroTitle}>{OWNER_BUSINESS_PROFILE.name}</Text>
              </View>
            </View>
            <View style={styles.heroMeta}>
              <Ionicons name="star" size={13} color={c.gold} />
              <Text style={styles.heroMetaText}>{OWNER_BUSINESS_PROFILE.rating.toFixed(1)}</Text>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>{OWNER_BUSINESS_PROFILE.reviewCount} reviews</Text>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>{OWNER_BUSINESS_PROFILE.cuisine}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color={c.textMuted} />
              <Text style={styles.addressText}>{OWNER_BUSINESS_PROFILE.address}</Text>
            </View>
            <View style={styles.heroButtons}>
              <Pressable
                style={({ pressed }) => [styles.previewBtn, pressed && styles.btnPressed]}
                onPress={() => router.push('/(customer)/discover/r1?preview=1' as never)}
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
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Pressable onPress={() => {}} accessibilityRole="button">
              <Text style={styles.sectionAction}>See all</Text>
            </Pressable>
            <Pressable onPress={addPhoto} accessibilityRole="button">
              <Text style={styles.sectionAction}>+ Add</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.photosRow}>
          {[0, 1, 2].map((i) => (
            <Pressable
              key={i}
              style={styles.photoThumb}
              onPress={() => pickPhoto(i)}
              accessibilityRole="button"
              accessibilityLabel={photoUris[i] ? `Change photo ${i + 1}` : `Add photo ${i + 1}`}
            >
              {photoUris[i] ? (
                <Image source={{ uri: photoUris[i] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <PhotoPlaceholder index={i} />
              )}
            </Pressable>
          ))}
        </View>

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
        <Text style={styles.bodyText}>{OWNER_BUSINESS_PROFILE.description}</Text>

        {/* ── Menu ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Menu</Text>
        </View>

        {/* Summary row */}
        <View style={styles.menuCard}>
          {/* Action grid */}
          <View style={styles.menuGrid}>
            <Pressable
              style={({ pressed }) => [styles.menuGridTile, pressed && styles.menuGridTilePressed]}
              onPress={() => router.push('/(staff)/menu-manage' as never)}
            >
              <View style={[styles.menuGridIcon, { backgroundColor: c.gold }]}>
                <Ionicons name="add" size={18} color={c.bgBase} />
              </View>
              <Text style={styles.menuGridLabel}>Add item</Text>
              <Text style={styles.menuGridSub}>New dish</Text>
            </Pressable>
            <View style={styles.menuGridDivider} />
            <Pressable
              style={({ pressed }) => [styles.menuGridTile, pressed && styles.menuGridTilePressed]}
              onPress={() => router.push('/(staff)/menu-manage' as never)}
            >
              <View style={[styles.menuGridIcon, { backgroundColor: c.gold }]}>
                <Ionicons name="pencil" size={18} color={c.bgBase} />
              </View>
              <Text style={styles.menuGridLabel}>Edit menu</Text>
              <Text style={styles.menuGridSub}>{menuItems.length} items</Text>
            </Pressable>
          </View>

          {/* 86'd item highlight */}
          {menuItems.filter((i) => !i.isAvailable).length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.menu86Row, pressed && styles.menu86RowPressed]}
              onPress={() => router.push('/(staff)/menu-manage' as never)}
            >
              <View style={styles.menu86Badge}>
                <Text style={styles.menu86BadgeText}>86</Text>
              </View>
              <Text style={styles.menu86Name}>
                {menuItems.find((i) => !i.isAvailable)?.name}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          )}
        </View>

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
              onPress={() => row.route && router.push(row.route as never)}
              accessibilityRole="button"
            >
              <Text style={styles.settingsLabel}>{row.label}</Text>
              {row.value ? <Text style={styles.settingsValue}>{row.value}</Text> : null}
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* ── Sign out ── */}
        <Pressable
          style={({ pressed }) => [styles.signOutWrap, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() =>
            Alert.alert('Sign out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => {} },
            ])
          }
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
