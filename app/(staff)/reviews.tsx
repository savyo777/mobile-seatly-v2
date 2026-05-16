import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import {
  fetchRestaurantOwnerReviews,
  type OwnerReviewRow,
} from '@/lib/reviews/getRestaurantOwnerReviews';
import { borderRadius, createStyles, spacing, useColors } from '@/lib/theme';

function formatReviewDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderStars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

export default function OwnerReviewsScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ restaurantId?: string }>();
  const { selectedRestaurant } = useOwnerScope();
  const restaurantId =
    (Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId) ||
    selectedRestaurant?.id ||
    '';

  const [reviews, setReviews] = useState<OwnerReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const anonymousLabel = t('ownerReviews.anonymous');

  useEffect(() => {
    if (!restaurantId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetchRestaurantOwnerReviews(restaurantId, anonymousLabel)
      .then((rows) => {
        if (active) setReviews(rows);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load reviews.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [restaurantId, anonymousLabel]);

  const renderCard = useCallback(
    ({ item }: { item: OwnerReviewRow }) => (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.reviewerName} numberOfLines={1}>{item.reviewerName}</Text>
          <Text style={styles.stars} accessibilityLabel={`${item.rating} stars`}>
            {renderStars(item.rating)}
          </Text>
        </View>
        {item.createdAt ? (
          <Text style={styles.dateText}>{formatReviewDate(item.createdAt)}</Text>
        ) : null}
        {item.body?.trim() ? (
          <Text style={styles.bodyText}>{item.body.trim()}</Text>
        ) : null}
        {item.photoUrls.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoStrip}
            contentContainerStyle={styles.photoStripContent}
          >
            {item.photoUrls.map((url) => (
              <Pressable
                key={url}
                onPress={() => setPreviewPhoto(url)}
                accessibilityRole="button"
                accessibilityLabel={t('ownerReviews.photosLabel')}
              >
                <Image source={{ uri: url }} style={styles.photo} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    ),
    [styles, t],
  );

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={c.gold} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    if (reviews.length === 0) {
      return (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={36} color={c.textMuted} />
          <Text style={styles.emptyText}>{t('ownerReviews.empty')}</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [loading, error, reviews, renderCard, styles, c, t]);

  return (
    <OwnerScreen
      scrollable={false}
      header={
        <SubpageHeader
          title={t('ownerReviews.title')}
          accentBack
          onBack={() => router.back()}
        />
      }
    >
      {content}
      <Modal
        visible={previewPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhoto(null)}
      >
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewPhoto(null)}>
          {previewPhoto ? (
            <Image source={{ uri: previewPhoto }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </OwnerScreen>
  );
}

const useStyles = createStyles((c) => ({
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.md,
  },
  card: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reviewerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  stars: {
    fontSize: 14,
    color: c.gold,
    letterSpacing: 1,
  },
  dateText: {
    fontSize: 12,
    color: c.textMuted,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },
  photoStrip: {
    marginTop: spacing.sm,
  },
  photoStripContent: {
    gap: spacing.sm,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: c.danger,
    textAlign: 'center',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
}));
