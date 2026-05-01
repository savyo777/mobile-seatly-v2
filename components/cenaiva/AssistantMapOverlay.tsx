import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { RestaurantDiscoveryMap } from '@/components/map/RestaurantDiscoveryMap';
import type { Restaurant } from '@/lib/mock/restaurants';
import { DEFAULT_MAP_CENTER, withDistances } from '@/lib/map/mapFilters';
import { createStyles, borderRadius, spacing } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  shell: {
    height: 210,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
    marginTop: spacing.md,
  },
}));

export function AssistantMapOverlay({
  restaurants,
  highlightedId,
  onSelectRestaurant,
}: {
  restaurants: Restaurant[];
  highlightedId: string | null;
  onSelectRestaurant: (restaurant: Restaurant) => void;
}) {
  const styles = useStyles();
  const [selectedId, setSelectedId] = useState(highlightedId);
  const mapped = useMemo(
    () => withDistances(restaurants, DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude),
    [restaurants],
  );

  if (!restaurants.length) return null;

  return (
    <View style={styles.shell}>
      <RestaurantDiscoveryMap
        filteredRestaurants={mapped}
        selectedId={highlightedId ?? selectedId}
        onSelectRestaurant={(id) => {
          setSelectedId(id);
          const restaurant = restaurants.find((item) => item.id === id);
          if (restaurant) onSelectRestaurant(restaurant);
        }}
        onMapPress={() => setSelectedId(null)}
        userLocation={null}
        showUserLocation={false}
        locationReady
      />
    </View>
  );
}
