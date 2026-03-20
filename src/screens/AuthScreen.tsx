import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { registerWithEmail, resetPassword, signInWithEmail } from '../services/account';

type AuthMode = 'login' | 'register';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (mode === 'register') {
        await registerWithEmail({ email, password });
        return;
      }

      await signInWithEmail({ email, password });
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setError(null);
      await resetPassword(email);
      Alert.alert('送信しました', 'パスワード再設定メールを送信しました。');
    } catch (resetError) {
      setError((resetError as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'login' ? 'ログイン' : '新規登録'}</Text>
        <Text style={styles.description}>メールアドレスとパスワードで認証してください。</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          placeholderTextColor="#8b8f95"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="パスワード"
          placeholderTextColor="#8b8f95"
          secureTextEntry
        />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable style={styles.primaryButton} onPress={() => void handleSubmit()} disabled={isSubmitting}>
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            setMode((current) => (current === 'login' ? 'register' : 'login'));
            setError(null);
          }}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>
            {mode === 'login' ? '新規登録はこちら' : 'ログインはこちら'}
          </Text>
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => void handleResetPassword()} disabled={isSubmitting}>
          <Text style={styles.linkText}>パスワードを忘れた場合</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f1ea',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c1f14',
  },
  description: {
    fontSize: 14,
    color: '#5d5246',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7cdc0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2b2b2b',
    backgroundColor: '#fffdfb',
  },
  errorCard: {
    backgroundColor: '#ffe8e3',
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: '#8e2d22',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#2f2214',
    borderRadius: 12,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#fff7ef',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d8c8b7',
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#58402d',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    color: '#3c5f9b',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});
