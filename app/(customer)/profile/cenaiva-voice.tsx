import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { CenaivaVoiceOptionList } from '@/components/cenaiva/CenaivaVoiceOptionList';
import { Button } from '@/components/ui/Button';
import { useCenaivaVoicePreference } from '@/lib/cenaiva/voice/CenaivaVoicePreferenceProvider';
import type { CenaivaTtsVoice } from '@/lib/cenaiva/voice/voicePreference';
import { createStyles, spacing, typography } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  loadingWrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing['3xl'],
  },
  loadingText: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  hint: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
}));

export default function CenaivaVoiceScreen() {
  const styles = useStyles();
  const {
    voicePreference,
    isLoading,
    isSaving,
    setVoicePreference,
  } = useCenaivaVoicePreference();
  const [pendingVoice, setPendingVoice] = useState<CenaivaTtsVoice | null>(voicePreference);

  useEffect(() => {
    setPendingVoice(voicePreference);
  }, [voicePreference]);

  return (
    <ProfileStackScreen
      title="Hey Cenaiva voice"
      subtitle="Choose the voice Hey Cenaiva uses when speaking with you."
    >
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#C8A951" />
          <Text style={styles.loadingText}>Loading your saved voice...</Text>
        </View>
      ) : (
        <>
          <CenaivaVoiceOptionList
            selectedVoice={pendingVoice}
            disabled={isSaving}
            onSelect={setPendingVoice}
          />
          <Button
            title="Confirm voice"
            onPress={() => {
              if (!pendingVoice) return;
              void setVoicePreference(pendingVoice);
            }}
            loading={isSaving}
            disabled={!pendingVoice || pendingVoice === voicePreference}
            style={styles.saveButton}
          />
        </>
      )}
      <Text style={styles.hint}>
        This choice is saved to your Cenaiva account so it can be reused across devices.
      </Text>
      {isSaving ? (
        <Text style={styles.loadingText}>Saving your voice preference...</Text>
      ) : null}
    </ProfileStackScreen>
  );
}
