import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { getSnapUser, listSnapPostsByRestaurant, getSnapRestaurantName } from '@/lib/mock/snaps';

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgSurface,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: c.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  grid: {
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  col: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.26)',
    backgroundColor: '#101010',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  photo: {
    width: '100%',
    height: 170,
    backgroundColor: c.bgElevated,
  },
  cardBody: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
  },
  username: {
    ...typography.bodySmall,
    color: '#DDD5C4',
    fontWeight: '700',
    flex: 1,
  },
  caption: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
}));

export default function RestaurantSnapGalleryScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const [pressingId, setPressingId] = useState<string | null>(null);

  const snaps = useMemo(() => listSnapPostsByRestaurant(restaurantId), [restaurantId]);
  const restaurantName = useMemo(() => getSnapRestaurantName(restaurantId), [restaurantId]);

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Guest Snaps</Text>
            <Text style={styles.subtitle}>{restaurantName} · Real moments shared by diners</Text>
          </View>
        </View>

        <FlatList
          data={snaps}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.col}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const user = getSnapUser(item.user_id);
            const pressed = pressingId === item.id;
            return (
              <Pressable
                onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}?restaurantId=${restaurantId}`)}
                onPressIn={() => setPressingId(item.id)}
                onPressOut={() => setPressingId(null)}
                style={[styles.card, pressed && styles.cardPressed]}
              >
                <Image source={{ uri: item.image }} style={styles.photo} />
                <View style={styles.cardBody}>
                  <View style={styles.userRow}>
                    {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatar} />}
                    <Text style={styles.username} numberOfLines={1}>
                      @{user?.username ?? 'guest'}
                    </Text>
                  </View>
                  <Text style={styles.caption} numberOfLines={3}>
                    {item.caption}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenWrapper>
  );
}
