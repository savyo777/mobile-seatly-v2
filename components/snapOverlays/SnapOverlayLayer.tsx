import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { SnapOverlayContext } from '@/lib/snapOverlays/types';
import { SNAP_OVERLAY_NONE_ID } from '@/lib/snapOverlays/catalog';

const GOLD = '#D4BC6A';
const GOLD_BORDER = 'rgba(212,188,106,0.85)';
const GLASS_BG = 'rgba(8,8,10,0.72)';

type Props = {
  overlayId: string | null;
  context: SnapOverlayContext;
  reviewTexts: Record<string, string>;
  onReviewChange: (overlayId: string, text: string) => void;
  style?: StyleProp<ViewStyle>;
};

function Watermark({ subtle }: { subtle?: boolean }) {
  return (
    <Text
      style={[styles.watermark, subtle && styles.watermarkSubtle]}
      pointerEvents="none"
    >
      CENAIVA
    </Text>
  );
}

function SparkleRow() {
  return (
    <View style={styles.sparkleRow} pointerEvents="none">
      {[0, 1, 2, 3, 4].map((i) => (
        <Text key={i} style={styles.sparkle}>
          ✦
        </Text>
      ))}
    </View>
  );
}

export function SnapOverlayLayer({
  overlayId,
  context,
  reviewTexts,
  onReviewChange,
  style,
}: Props) {
  if (!overlayId || overlayId === SNAP_OVERLAY_NONE_ID) {
    return null;
  }

  const { restaurantName, city, area, bookedTimeLabel, partySize } = context;

  const reviewCard = (prompt: string, lines = 2, children?: React.ReactNode) => (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewPrompt}>{prompt}</Text>
      {children}
      <TextInput
        value={reviewTexts[overlayId] ?? ''}
        onChangeText={(t) => onReviewChange(overlayId, t)}
        placeholder="Tap to answer…"
        placeholderTextColor="rgba(255,255,255,0.38)"
        style={[styles.reviewInput, { minHeight: lines * 22 }]}
        multiline
        maxLength={140}
      />
    </View>
  );

  let body: React.ReactNode = null;

  switch (overlayId) {
    case 'branded.dined-by-cenaiva':
      body = (
        <>
          <Watermark subtle />
          <View style={styles.bottomCenter}>
            <View style={styles.glassPill}>
              <Text style={styles.pillEyebrow}>Dined by Cenaiva</Text>
              <Text style={styles.pillTitle}>{restaurantName}</Text>
              <Text style={styles.pillSub}>{city}</Text>
            </View>
          </View>
        </>
      );
      break;

    case 'branded.booked-on-cenaiva':
      body = (
        <>
          <Watermark subtle />
          <View style={styles.bottomCenter}>
            <LinearGradient
              colors={['rgba(18,14,8,0.95)', 'rgba(8,8,10,0.92)']}
              style={styles.bookingSticker}
            >
              <Text style={styles.stickerEyebrow}>Booked on</Text>
              <Text style={styles.stickerBrand}>CENAIVA</Text>
              <View style={styles.bookingDivider} />
              <Text style={styles.bookingMeta}>{bookedTimeLabel}</Text>
              <Text style={styles.bookingMeta}>Table for {partySize}</Text>
            </LinearGradient>
          </View>
        </>
      );
      break;

    case 'branded.night-out-cenaiva':
      body = (
        <>
          <LinearGradient
            colors={['rgba(12,8,28,0.45)', 'rgba(6,4,14,0.78)', 'rgba(4,2,12,0.88)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <SparkleRow />
          <View style={styles.topBand}>
            <Text style={styles.nightOutTitle}>Cenaiva Night Out</Text>
          </View>
          <Watermark subtle />
        </>
      );
      break;

    case 'branded.pick-cenaiva':
      body = (
        <>
          <View style={styles.stampPick}>
            <Text style={styles.stampPickInner}>CENAIVA</Text>
            <Text style={styles.stampPickSub}>PICK</Text>
          </View>
          <Watermark subtle />
        </>
      );
      break;

    case 'branded.hidden-gem-cenaiva':
      body = (
        <>
          <View style={styles.midSticker}>
            <View style={styles.hiddenGemBadge}>
              <Ionicons name="diamond-outline" size={18} color={GOLD} />
              <Text style={styles.hiddenGemText}>Hidden Gem · Cenaiva</Text>
            </View>
          </View>
        </>
      );
      break;

    case 'branded.date-night-cenaiva':
      body = (
        <>
          <LinearGradient
            colors={['rgba(80,24,40,0.35)', 'transparent', 'rgba(24,10,28,0.5)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Watermark subtle />
          <View style={styles.bottomCenter}>
            <View style={styles.dateNightPill}>
              <Ionicons name="wine-outline" size={16} color={GOLD} />
              <Text style={styles.dateNightText}>Date Night · Cenaiva</Text>
              <Text style={styles.heartMini}>♥</Text>
            </View>
          </View>
        </>
      );
      break;

    case 'branded.a-cenaiva-find':
      body = (
        <View style={styles.topBanner}>
          <Text style={styles.bannerFind}>A Cenaiva Find</Text>
          <Text style={styles.bannerFindTagline}>This spot was found on Cenaiva</Text>
          <Text style={styles.bannerFindSub}>{restaurantName}</Text>
        </View>
      );
      break;

    case 'loc.dinner-at':
      body = (
        <View style={styles.bottomCenter}>
          <View style={styles.cleanSticker}>
            <Text style={styles.cleanEyebrow}>Dinner at</Text>
            <Text style={styles.cleanTitle}>{restaurantName}</Text>
          </View>
        </View>
      );
      break;

    case 'loc.name-city':
      body = (
        <View style={styles.bottomCenter}>
          <View style={styles.stampGold}>
            <Text style={styles.stampGoldMain}>{restaurantName}</Text>
            <Text style={styles.stampGoldDot}>·</Text>
            <Text style={styles.stampGoldCity}>{city}</Text>
          </View>
        </View>
      );
      break;

    case 'loc.booked-for-time':
      body = (
        <View style={styles.bottomCenter}>
          <View style={styles.timePill}>
            <Text style={styles.timePillLabel}>Booked for</Text>
            <Text style={styles.timePillTime}>{bookedTimeLabel}</Text>
          </View>
        </View>
      );
      break;

    case 'loc.table-for-party':
      body = (
        <View style={[styles.bottomCenter, { transform: [{ rotate: '-4deg' }] }]}>
          <View style={styles.tableStamp}>
            <Text style={styles.tableStampLabel}>Table for</Text>
            <Text style={styles.tableStampNum}>{partySize}</Text>
          </View>
        </View>
      );
      break;

    case 'loc.tonight-at':
      body = (
        <View style={styles.bottomWide}>
          <LinearGradient colors={['rgba(6,6,10,0.92)', 'rgba(14,12,18,0.88)']} style={styles.tonightBanner}>
            <Text style={styles.tonightTitle}>Tonight at {restaurantName}</Text>
            <Text style={styles.tonightSub}>
              {area} · {bookedTimeLabel}
            </Text>
          </LinearGradient>
        </View>
      );
      break;

    case 'occ.birthday':
      body = (
        <>
          <View style={styles.confettiBand} pointerEvents="none">
            {['🎉', '✨', '🎈', '✨', '🎊'].map((e, i) => (
              <Text key={i} style={styles.confettiEmoji}>
                {e}
              </Text>
            ))}
          </View>
          <View style={styles.bottomCenter}>
            <View style={styles.occBanner}>
              <Text style={styles.occTitle}>Birthday Dinner</Text>
            </View>
          </View>
        </>
      );
      break;

    case 'occ.date-night':
      body = (
        <>
          <LinearGradient
            colors={['rgba(72,20,36,0.4)', 'transparent', 'rgba(36,12,28,0.55)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.bottomCenter}>
            <Text style={styles.romanticScript}>Date Night</Text>
            <Text style={styles.romanticHearts}>♥ ♥ ♥</Text>
          </View>
        </>
      );
      break;

    case 'occ.anniversary':
      body = (
        <View style={styles.midSticker}>
          <View style={styles.anniversaryFrame}>
            <Text style={styles.anniversaryLabel}>Anniversary</Text>
            <Ionicons name="restaurant-outline" size={22} color={GOLD} />
          </View>
        </View>
      );
      break;

    case 'occ.family':
      body = (
        <>
          <LinearGradient
            colors={['rgba(96,52,28,0.25)', 'transparent', 'rgba(48,28,14,0.4)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.bottomCenter}>
            <View style={styles.familyPill}>
              <Text style={styles.familyText}>Family Dinner</Text>
            </View>
          </View>
        </>
      );
      break;

    case 'occ.girls-night':
      body = (
        <>
          <LinearGradient
            colors={['rgba(120,24,140,0.35)', 'rgba(40,8,80,0.55)', 'rgba(10,4,24,0.75)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.centerNeon}>
            <Text style={[styles.neonSign, { color: '#FFB8F0' }]}>GIRLS NIGHT</Text>
          </View>
        </>
      );
      break;

    case 'occ.boys-night':
      body = (
        <>
          <LinearGradient
            colors={['rgba(8,28,72,0.5)', 'rgba(4,12,36,0.75)', 'rgba(2,6,18,0.85)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.centerNeon}>
            <Text style={[styles.neonSign, { color: '#7EC8FF' }]}>BOYS NIGHT</Text>
          </View>
        </>
      );
      break;

    case 'occ.business':
      body = (
        <View style={styles.topBannerMuted}>
          <Text style={styles.businessEyebrow}>Business Dinner</Text>
          <Text style={styles.businessVenue}>{restaurantName}</Text>
        </View>
      );
      break;

    case 'occ.late-night':
      body = (
        <>
          <LinearGradient
            colors={['rgba(255,214,120,0.12)', 'transparent', 'rgba(40,20,90,0.55)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.bottomCenter}>
            <Text style={styles.lateNight}>Late Night Eats</Text>
          </View>
        </>
      );
      break;

    case 'food.pizza-night':
      body = (
        <View style={styles.cornerFood}>
          <Text style={styles.foodEmoji}>🍕</Text>
          <Text style={styles.foodSticker}>Pizza Night</Text>
        </View>
      );
      break;

    case 'food.omakase':
      body = (
        <View style={styles.frameThin}>
          <View style={styles.omakaseTopRow}>
            <View style={[styles.frameCorner, styles.omakaseCorner]}>
              <Text style={styles.sushiEmoji}>🍣</Text>
              <Text style={styles.chopstickPair}>🥢</Text>
            </View>
            <View style={styles.omakaseChopAccent}>
              <Text style={styles.chopstickLarge}>🥢</Text>
            </View>
          </View>
          <Text style={styles.frameCaption}>Omakase</Text>
        </View>
      );
      break;

    case 'food.pasta-bar':
      body = (
        <View style={styles.framePasta}>
          <Text style={styles.pastaEmoji}>🍝</Text>
          <Text style={styles.frameCaption}>Pasta Bar</Text>
        </View>
      );
      break;

    case 'food.burger-run':
      body = (
        <View style={[styles.cornerFood, { alignSelf: 'flex-end', alignItems: 'flex-end' }]}>
          <View style={styles.burgerLineArt}>
            <Text style={styles.burgerSketch}>🍔</Text>
            <View style={styles.burgerSketchLine} />
            <Text style={styles.burgerSketch}>🍟</Text>
          </View>
          <Text style={styles.foodStickerLineArt}>Burger Run</Text>
        </View>
      );
      break;

    case 'food.sweet-bite':
      body = (
        <>
          <LinearGradient
            colors={['rgba(255,240,252,0.2)', 'transparent', 'rgba(180,120,200,0.25)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.midSticker}>
            <Text style={styles.sweetSparkle}>✦ Sweet Bite ✦</Text>
          </View>
        </>
      );
      break;

    case 'food.coffee-break':
      body = (
        <View style={styles.topSteam}>
          <Text style={styles.steam}>~ ~ ~</Text>
          <Text style={styles.coffeeLabel}>Coffee Break</Text>
        </View>
      );
      break;

    case 'food.spicy':
      body = (
        <View style={styles.bottomCenter}>
          <View style={styles.flameRow}>
            <Ionicons name="flame" size={28} color="#FF6B35" />
            <Text style={styles.spicyText}>Spicy</Text>
            <Ionicons name="flame" size={28} color="#FF6B35" />
          </View>
        </View>
      );
      break;

    case 'food.brunch':
      body = (
        <View style={styles.bottomCenter}>
          <View style={styles.brunchBadge}>
            <Text style={styles.brunchText}>BRUNCH</Text>
          </View>
        </View>
      );
      break;

    case 'food.first-bite':
      body = (
        <View style={[styles.midSticker, { transform: [{ rotate: '-8deg' }] }]}>
          <View style={styles.firstBiteStamp}>
            <Text style={styles.firstBiteText}>FIRST BITE</Text>
          </View>
        </View>
      );
      break;

    case 'food.must-try':
      body = (
        <View style={[styles.midSticker, { transform: [{ rotate: '6deg' }] }]}>
          <View style={styles.mustTryStamp}>
            <Text style={styles.mustTryText}>MUST TRY</Text>
          </View>
        </View>
      );
      break;

    case 'vibe.palm-patio':
      body = (
        <>
          <Text style={styles.palmLeft}>🌴</Text>
          <Text style={styles.palmRight}>🌴</Text>
          <View style={styles.bottomCenter}>
            <Text style={styles.vibeCaption}>Palm Patio</Text>
          </View>
        </>
      );
      break;

    case 'vibe.golden-sunset':
      body = (
        <LinearGradient
          colors={['rgba(255,198,120,0.45)', 'rgba(255,140,60,0.2)', 'rgba(40,20,60,0.35)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      );
      break;

    case 'vibe.rooftop-lights':
      body = (
        <>
          <LinearGradient
            colors={['rgba(8,12,28,0.55)', 'rgba(4,6,14,0.35)', 'rgba(2,4,10,0.75)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.lightsRow} pointerEvents="none">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Text key={i} style={styles.lightDot}>
                •
              </Text>
            ))}
          </View>
        </>
      );
      break;

    case 'vibe.out-tonight':
      body = (
        <View style={styles.centerNeon}>
          <Text style={[styles.neonSign, { color: '#B4F5A0' }]}>OUT TONIGHT</Text>
        </View>
      );
      break;

    case 'vibe.luxury-frame':
      body = (
        <View style={styles.luxuryFrame} pointerEvents="none">
          <View style={[styles.luxuryEdge, styles.luxuryTop]} />
          <View style={[styles.luxuryEdge, styles.luxuryBottom]} />
          <View style={[styles.luxuryEdge, styles.luxuryLeft]} />
          <View style={[styles.luxuryEdge, styles.luxuryRight]} />
        </View>
      );
      break;

    case 'vibe.flash':
      body = (
        <>
          <View style={styles.flashBurst} pointerEvents="none" />
          <Text style={styles.flashLabel}>FLASH</Text>
        </>
      );
      break;

    case 'rev.worth-it':
      body = <View style={styles.reviewWrap}>{reviewCard('Worth it?')}</View>;
      break;
    case 'rev.best-dish':
      body = <View style={styles.reviewWrap}>{reviewCard('Best dish of the night')}</View>;
      break;
    case 'rev.come-back':
      body = <View style={styles.reviewWrap}>{reviewCard('Would you come back?')}</View>;
      break;
    case 'rev.rate-bite':
      body = (
        <View style={styles.reviewWrap}>
          {reviewCard(
            'Rate the bite',
            2,
            <View style={styles.starDecoration} pointerEvents="none">
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons key={i} name="star" size={20} color={GOLD} style={{ opacity: 0.45 }} />
              ))}
            </View>,
          )}
        </View>
      );
      break;
    case 'rev.cenaiva-score':
      body = (
        <View style={styles.reviewWrap}>
          {reviewCard(
            'Cenaiva Score',
            2,
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeExample}>9/10</Text>
              <Text style={styles.scoreBadgeHint}>example</Text>
            </View>,
          )}
        </View>
      );
      break;
    case 'rev.hidden-or-hyped':
      body = <View style={styles.reviewWrap}>{reviewCard('Hidden gem or overhyped?')}</View>;
      break;
    case 'rev.my-order':
      body = <View style={styles.reviewWrap}>{reviewCard('My order')}</View>;
      break;
    case 'rev.the-vibe':
      body = <View style={styles.reviewWrap}>{reviewCard('The vibe')}</View>;
      break;
    case 'rev.the-food':
      body = <View style={styles.reviewWrap}>{reviewCard('The food')}</View>;
      break;
    case 'rev.the-service':
      body = <View style={styles.reviewWrap}>{reviewCard('The service')}</View>;
      break;

    default:
      body = null;
  }

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  watermark: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: 'rgba(212,188,106,0.35)',
  },
  watermarkSubtle: {
    color: 'rgba(212,188,106,0.22)',
  },
  sparkleRow: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  sparkle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
  },
  bottomCenter: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bottomWide: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'stretch',
  },
  glassPill: {
    backgroundColor: GLASS_BG,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: GOLD_BORDER,
    alignItems: 'center',
    maxWidth: '92%',
  },
  pillEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
  },
  pillTitle: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  pillSub: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  bookingSticker: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    minWidth: 220,
  },
  stickerEyebrow: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
  },
  stickerBrand: {
    fontSize: 22,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 4,
    marginTop: 4,
  },
  bookingDivider: {
    height: 1,
    backgroundColor: 'rgba(212,188,106,0.35)',
    width: '70%',
    marginVertical: 10,
  },
  bookingMeta: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(6,4,14,0.55)',
  },
  nightOutTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    color: GOLD,
  },
  stampPick: {
    position: 'absolute',
    top: '38%',
    right: 24,
    transform: [{ rotate: '12deg' }],
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(8,8,10,0.82)',
  },
  stampPickInner: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    color: GOLD,
    textAlign: 'center',
  },
  stampPickSub: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 2,
  },
  midSticker: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenGemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GLASS_BG,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: GOLD_BORDER,
  },
  hiddenGemText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  dateNightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(48,14,28,0.75)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,160,190,0.5)',
  },
  dateNightText: {
    color: '#FFE8EE',
    fontWeight: '700',
    fontSize: 13,
  },
  heartMini: {
    color: '#FF8FA8',
    fontSize: 12,
  },
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(8,8,12,0.88)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: GOLD_BORDER,
    alignItems: 'center',
  },
  bannerFind: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: GOLD,
    textAlign: 'center',
  },
  bannerFindTagline: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
  },
  bannerFindSub: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  cleanSticker: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cleanEyebrow: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.45)',
    fontWeight: '600',
  },
  cleanTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#141418',
    textAlign: 'center',
  },
  stampGold: {
    backgroundColor: GLASS_BG,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
  },
  stampGoldMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  stampGoldDot: {
    color: GOLD,
    fontSize: 14,
    marginVertical: 2,
  },
  stampGoldCity: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  timePill: {
    backgroundColor: 'rgba(212,188,106,0.22)',
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  timePillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  timePillTime: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: GOLD,
  },
  tableStamp: {
    backgroundColor: GLASS_BG,
    paddingVertical: 16,
    paddingHorizontal: 26,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  tableStampLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tableStampNum: {
    marginTop: 4,
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  tonightBanner: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 2,
    borderColor: GOLD_BORDER,
  },
  tonightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  tonightSub: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  confettiBand: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  confettiEmoji: {
    fontSize: 22,
  },
  occBanner: {
    backgroundColor: GLASS_BG,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  occTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  romanticScript: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFD6E4',
    fontStyle: 'italic',
  },
  romanticHearts: {
    marginTop: 8,
    fontSize: 14,
    color: '#FFB4CC',
    textAlign: 'center',
  },
  anniversaryFrame: {
    borderWidth: 3,
    borderColor: GOLD,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 36,
    backgroundColor: 'rgba(10,10,12,0.55)',
    alignItems: 'center',
    gap: 10,
  },
  anniversaryLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 2,
  },
  familyPill: {
    backgroundColor: 'rgba(255,235,210,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,200,160,0.45)',
  },
  familyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFE8D8',
  },
  centerNeon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonSign: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  topBannerMuted: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(12,12,16,0.88)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  businessEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
  },
  businessVenue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  lateNight: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#C9B8FF',
  },
  cornerFood: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    alignItems: 'flex-start',
  },
  foodEmoji: {
    fontSize: 36,
  },
  foodSticker: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: GLASS_BG,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  foodLine: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  burgerLineArt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  burgerSketch: {
    fontSize: 28,
  },
  burgerSketchLine: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 1,
  },
  foodStickerLineArt: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  frameThin: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    justifyContent: 'space-between',
  },
  frameCorner: {
    alignSelf: 'flex-start',
    backgroundColor: GLASS_BG,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  omakaseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  omakaseCorner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chopstickPair: {
    fontSize: 22,
  },
  omakaseChopAccent: {
    paddingTop: 10,
    paddingRight: 4,
    opacity: 0.92,
  },
  chopstickLarge: {
    fontSize: 34,
    lineHeight: 40,
  },
  sushiEmoji: {
    fontSize: 28,
  },
  frameCaption: {
    alignSelf: 'center',
    marginBottom: 40,
    fontSize: 15,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 3,
    backgroundColor: GLASS_BG,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  framePasta: {
    ...StyleSheet.absoluteFillObject,
    padding: 18,
    margin: 12,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'rgba(212,188,106,0.45)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastaEmoji: {
    fontSize: 42,
    marginTop: 28,
  },
  sweetSparkle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFE8FF',
    letterSpacing: 2,
  },
  topSteam: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    alignItems: 'center',
  },
  steam: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 6,
  },
  coffeeLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 2,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: GLASS_BG,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.6)',
  },
  spicyText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  brunchBadge: {
    borderWidth: 2,
    borderColor: GOLD,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: 'rgba(255,248,230,0.15)',
  },
  brunchText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 5,
    color: GOLD,
  },
  firstBiteStamp: {
    borderWidth: 3,
    borderColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: GLASS_BG,
  },
  firstBiteText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#fff',
  },
  mustTryStamp: {
    borderWidth: 2,
    borderColor: GOLD,
    paddingVertical: 16,
    paddingHorizontal: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(212,188,106,0.18)',
    transform: [{ rotate: '-3deg' }],
  },
  mustTryText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 4,
    color: GOLD,
  },
  palmLeft: {
    position: 'absolute',
    top: 40,
    left: 8,
    fontSize: 42,
  },
  palmRight: {
    position: 'absolute',
    top: 40,
    right: 8,
    fontSize: 42,
  },
  vibeCaption: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: GLASS_BG,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(120,220,160,0.45)',
  },
  lightsRow: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  lightDot: {
    color: 'rgba(255,230,160,0.85)',
    fontSize: 28,
    fontWeight: '700',
  },
  luxuryFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 10,
  },
  luxuryEdge: {
    position: 'absolute',
    backgroundColor: GOLD,
  },
  luxuryTop: {
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    opacity: 0.85,
  },
  luxuryBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    opacity: 0.85,
  },
  luxuryLeft: {
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
    opacity: 0.85,
  },
  luxuryRight: {
    top: 0,
    bottom: 0,
    right: 0,
    width: 5,
    opacity: 0.85,
  },
  flashBurst: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  flashLabel: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 6,
    color: 'rgba(0,0,0,0.55)',
  },
  reviewWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  reviewCard: {
    backgroundColor: 'rgba(10,10,14,0.88)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GOLD_BORDER,
    padding: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 8 },
    }),
  },
  reviewPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
  starDecoration: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,188,106,0.14)',
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  scoreBadgeExample: {
    fontSize: 28,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: 1,
  },
  scoreBadgeHint: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  reviewInput: {
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    textAlignVertical: 'top',
  },
});
