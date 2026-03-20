import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AgeGateScreenProps = {
  onConfirm: () => Promise<void> | void;
};

export function AgeGateScreen({ onConfirm }: AgeGateScreenProps) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Step 1</Text>
        <Text style={styles.title}>年齢確認</Text>
        <Text style={styles.body}>このアプリは18歳以上向けです</Text>

        <Pressable style={styles.checkRow} onPress={() => setIsChecked((current) => !current)}>
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>私は18歳以上です</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, !isChecked && styles.primaryButtonDisabled]}
          onPress={() => void onConfirm()}
          disabled={!isChecked}
        >
          <Text style={styles.primaryButtonText}>続ける</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe6',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fffdf9',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#312014',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  eyebrow: {
    color: '#9a5b2c',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#23150c',
    fontSize: 30,
    fontWeight: '800',
  },
  body: {
    color: '#5c4637',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
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
    borderColor: '#8f6849',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff9f3',
  },
  checkboxChecked: {
    backgroundColor: '#2f2115',
    borderColor: '#2f2115',
  },
  checkmark: {
    color: '#fff9f3',
    fontSize: 16,
    fontWeight: '800',
  },
  checkLabel: {
    flex: 1,
    color: '#412f22',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#23150c',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#fff9f3',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
