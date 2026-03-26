import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  clearAgeConfirmation,
  clearTermsAcceptance,
  getConsentState,
  TERMS_URL,
} from '../lib/consent';
import { hasFirebaseConfig } from '../lib/firebase';
import {
  deleteAccount,
  getAccountProfile,
  logout,
  type AccountProfile,
  updateNickname,
} from '../services/account';

export function AccountScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [nickname, setNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setError(null);
      const [nextProfile, consentState] = await Promise.all([getAccountProfile(), getConsentState()]);
      setProfile(nextProfile);
      setNickname('');
      setAgeConfirmed(consentState.ageConfirmed);
      setTermsAccepted(consentState.termsAccepted);
    } catch (loadError) {
      setError((loadError as Error).message);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadProfile();
    });

    return unsubscribe;
  }, [navigation]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await updateNickname(nickname);
      await loadProfile();
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('アカウントを削除しますか', 'ログイン中のアカウント情報と関連データを削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setIsSaving(true);
              setError(null);
              await deleteAccount();
            } catch (deleteError) {
              const message = (deleteError as Error).message;
              setError(
                message.includes('auth/requires-recent-login')
                  ? 'セキュリティ保護のため再ログインが必要です。いったんログアウトして再ログイン後に、もう一度アカウント削除を実行してください。'
                  : message,
              );
            } finally {
              setIsSaving(false);
            }
          })();
        },
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await logout();
    } catch (logoutError) {
      setError((logoutError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAgeConfirmation = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await clearAgeConfirmation();
      setAgeConfirmed(false);
    } catch (resetError) {
      setError((resetError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTermsAcceptance = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (termsAccepted) {
        await clearTermsAcceptance();
        setTermsAccepted(false);
      } else {
        const parentNavigation = navigation.getParent();

        if (!parentNavigation) {
          throw new Error('利用規約同意画面に遷移できませんでした。');
        }

        parentNavigation.navigate('TermsAgreement');
      }
    } catch (resetError) {
      setError((resetError as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      {!hasFirebaseConfig ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Firebase未設定</Text>
          <Text style={styles.noticeBody}>
            EXPO_PUBLIC_FIREBASE_* を設定し、Authenticationのメール/パスワード認証を有効化してください。
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>ニックネーム</Text>
        <Text style={styles.value}>{profile?.nickname ?? '未設定'}</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="ニックネームを入力"
          placeholderTextColor="#8d8f89"
        />

        <Pressable style={styles.primaryButton} onPress={() => void handleSave()} disabled={isSaving}>
          <Text style={styles.primaryButtonText}>{isSaving ? '保存中...' : 'ニックネームを保存'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>登録メールアドレス</Text>
        <Text style={styles.value}>{profile?.email ?? '未登録'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>年齢確認</Text>
        <Text style={styles.value}>18+確認：{ageConfirmed ? '済' : '未'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>利用規約</Text>
        <Text style={styles.value}>同意ステータス：{termsAccepted ? '済' : '未'}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(TERMS_URL)}>
          <Text style={styles.secondaryButtonText}>利用規約リンクを開く</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => void handleToggleTermsAcceptance()}
          disabled={isSaving}
        >
          <Text style={styles.secondaryButtonText}>{termsAccepted ? '同意を取り消す' : '同意する'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>ログアウト</Text>
        <Text style={styles.meta}>この端末のログイン状態を解除します。</Text>
        <Pressable style={styles.secondaryButton} onPress={() => void handleLogout()} disabled={isSaving}>
          <Text style={styles.secondaryButtonText}>ログアウト</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>アカウント削除</Text>
        <Text style={styles.meta}>削除後はログイン情報と関連データが削除されます。</Text>
        <Pressable style={styles.destructiveButton} onPress={handleDelete} disabled={isSaving}>
          <Text style={styles.destructiveButtonText}>アカウントを削除</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6f1',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  hero: {
    backgroundColor: '#1f2d22',
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  heroTitle: {
    color: '#f6fff8',
    fontSize: 30,
    fontWeight: '800',
  },
  heroBody: {
    color: '#d2e1d5',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  noticeCard: {
    backgroundColor: '#fff6df',
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  noticeTitle: {
    color: '#704c00',
    fontSize: 18,
    fontWeight: '700',
  },
  noticeBody: {
    color: '#815f17',
    fontSize: 14,
    lineHeight: 21,
  },
  errorCard: {
    backgroundColor: '#ffe7e4',
    borderRadius: 20,
    padding: 16,
  },
  errorText: {
    color: '#8e2b1f',
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: '#415345',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    color: '#1d251f',
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    color: '#5f6a62',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7ddd4',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1d251f',
    fontSize: 16,
    backgroundColor: '#fbfcfa',
  },
  primaryButton: {
    backgroundColor: '#243528',
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#f6fff8',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#ced8cf',
    borderRadius: 16,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#29402f',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveButton: {
    backgroundColor: '#5e221c',
    borderRadius: 16,
    paddingVertical: 15,
  },
  destructiveButtonText: {
    color: '#fff3f1',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
});
