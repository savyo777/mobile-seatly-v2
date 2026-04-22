import React from 'react';
import { LegalScreen } from '@/components/profile/LegalScreen';

// TODO: replace with finalized legal copy / auto-generate from package.json
export default function LicensesScreen() {
  return (
    <LegalScreen
      title="Open-Source Licenses"
      sections={[
        {
          heading: 'React Native',
          paragraphs: ['Copyright © Meta Platforms, Inc. and affiliates. Licensed under the MIT License.'],
        },
        {
          heading: 'Expo',
          paragraphs: ['Copyright © 650 Industries, Inc. Licensed under the MIT License.'],
        },
        {
          heading: 'expo-router',
          paragraphs: ['Copyright © 650 Industries, Inc. Licensed under the MIT License.'],
        },
        {
          heading: '@expo/vector-icons',
          paragraphs: ['Built on top of react-native-vector-icons. Licensed under the MIT License.'],
        },
        {
          heading: 'react-i18next',
          paragraphs: ['Copyright © i18next contributors. Licensed under the MIT License.'],
        },
        {
          heading: '@react-native-async-storage/async-storage',
          paragraphs: ['Copyright © React Native Community contributors. Licensed under the MIT License.'],
        },
        {
          heading: 'react-native-safe-area-context',
          paragraphs: ['Copyright © Th3rdwave. Licensed under the MIT License.'],
        },
        {
          heading: 'react-native-maps',
          paragraphs: ['Copyright © Airbnb and contributors. Licensed under the BSD 2-Clause License.'],
        },
        {
          heading: 'Supabase JS',
          paragraphs: ['Copyright © Supabase Inc. Licensed under the MIT License.'],
        },
        {
          heading: 'Full list',
          paragraphs: [
            'A complete list of open-source packages used in this app and their full licence texts is available at seatly.com/licenses.',
          ],
        },
      ]}
    />
  );
}
