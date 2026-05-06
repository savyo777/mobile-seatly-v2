import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: React.ReactNode;
  onClose?: () => void;
};

type State = {
  hasError: boolean;
};

export class CenaivaAssistantBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[Cenaiva] assistant render recovered', { error, info });
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Cenaiva needs a quick reset.</Text>
        <Text style={styles.body}>Your app is still running. Reopen the assistant to continue.</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={this.reset}>
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={this.props.onClose}>
            <Text style={styles.primaryText}>Close</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    minWidth: 104,
    borderRadius: 18,
    backgroundColor: '#C8A951',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    minWidth: 104,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200,169,81,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#C8A951',
    fontSize: 14,
    fontWeight: '800',
  },
});
