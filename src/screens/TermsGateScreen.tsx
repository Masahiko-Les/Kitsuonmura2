import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { TERMS_URL } from '../lib/consent';

type TermsGateScreenProps = {
  onAccept: () => Promise<void> | void;
};

export function TermsGateScreen({ onAccept }: TermsGateScreenProps) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Step 2</Text>
        <Text style={styles.title}>利用規約の同意</Text>
        <Text style={styles.body}>投稿・いいね・通報を利用するには利用規約への同意が必要です</Text>

        <Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(TERMS_URL)}>
          <Text style={styles.secondaryButtonText}>利用規約を読む</Text>
        </Pressable>

        <Pressable style={styles.checkRow} onPress={() => setIsChecked((current) => !current)}>
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>利用規約に同意します</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, !isChecked && styles.primaryButtonDisabled]}
          onPress={() => void onAccept()}
          disabled={!isChecked}
        >
          <Text style={styles.primaryButtonText}>同意して続ける</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f6ee',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fbfffa',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#1b2614',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  eyebrow: {
    color: '#4f6f38',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#172111',
    fontSize: 30,
    fontWeight: '800',
  },
  body: {
    color: '#47573d',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#70925b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7fff2',
  },
  checkboxChecked: {
    backgroundColor: '#203417',
    borderColor: '#203417',
  },
  checkmark: {
    color: '#f7fff2',
    fontSize: 16,
    fontWeight: '800',
  },
  checkLabel: {
    flex: 1,
    color: '#2a3d1e',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#aec59b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#355125',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#203417',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#f7fff2',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
