import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getConsentState } from '../lib/consent';
import { hasFirebaseConfig } from '../lib/firebase';
import {
  checkBanStatus,
  getAccountProfile,
  hasRegisteredNickname,
  requireAuthenticatedUser,
  type AccountProfile,
} from '../services/account';
import { createPost, type Post, subscribeToPosts } from '../services/posts';
import {
  blockUser,
  hidePost,
  subscribeBlockedUserIds,
  subscribeHiddenPostIds,
  toggleLike,
  toggleReport,
} from '../services/reactions';

type MainTabParamList = {
  Home: undefined;
  Account: undefined;
};

const NG_WORDS = ['死ね', '殺す', '暴力', '差別', 'spam'];

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NG_WORD_REGEX = new RegExp(NG_WORDS.map(escapeRegex).join('|'), 'i');

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [draftText, setDraftText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const nextProfile = await getAccountProfile();

        if (mounted) {
          setProfile(nextProfile);
        }
      } catch (loadError) {
        if (mounted) {
          setError((loadError as Error).message);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToPosts(setPosts, (subscriptionError) => setError(subscriptionError.message));
  }, []);

  useEffect(() => {
    if (!hasFirebaseConfig || !profile?.accountId) {
      return;
    }

    const unsubscribeHidden = subscribeHiddenPostIds(
      profile.accountId,
      setHiddenPostIds,
      (subscriptionError) => setError(subscriptionError.message),
    );
    const unsubscribeBlocked = subscribeBlockedUserIds(
      profile.accountId,
      setBlockedUserIds,
      (subscriptionError) => setError(subscriptionError.message),
    );

    return () => {
      unsubscribeHidden();
      unsubscribeBlocked();
    };
  }, [profile?.accountId]);

  const ngWordMatched = useMemo(() => NG_WORD_REGEX.test(draftText), [draftText]);
  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (item) => !hiddenPostIds.has(item.id) && !blockedUserIds.has(item.authorUid),
      ),
    [blockedUserIds, hiddenPostIds, posts],
  );

  const ensureInteractionAllowed = async (): Promise<string | null> => {
    if (!hasFirebaseConfig) {
      Alert.alert('Firebase設定が必要です', 'この機能を使うにはFirebase設定を完了してください。');
      return null;
    }

    const banStatus = await checkBanStatus();

    if (banStatus.isBanned) {
      Alert.alert('利用停止中', '現在このアカウントでは投稿・いいね・通報・ブロック・非表示を利用できません。');
      return null;
    }

    const user = requireAuthenticatedUser();
    return user.uid;
  };

  const handleCreatePost = async () => {
    const trimmed = draftText.trim();

    if (!trimmed) {
      Alert.alert('投稿内容を入力してください');
      return;
    }

    const { ageConfirmed, termsAccepted } = await getConsentState();

    if (!ageConfirmed || !termsAccepted) {
      Alert.alert('投稿できません', '投稿には年齢確認と利用規約同意が必要です。');
      return;
    }

    const nicknameRegistered = await hasRegisteredNickname();

    if (!nicknameRegistered) {
      Alert.alert('ニックネーム未登録', '投稿前にアカウント画面でニックネームを登録してください。', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'Accountへ移動',
          onPress: () => navigation.navigate('Account'),
        },
      ]);
      return;
    }

    if (ngWordMatched) {
      Alert.alert('投稿できません', 'NGワードを含むため投稿を拒否しました。');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const uid = await ensureInteractionAllowed();

      if (!uid) {
        return;
      }

      // 投稿時に最新のプロフィール情報を取得
      const latestProfile = await getAccountProfile();

      await createPost(trimmed, {
        uid,
        nickname: latestProfile?.nickname ?? 'ゲスト',
      });

      setDraftText('');
    } catch (submitError) {
      setError((submitError as Error).message);
      Alert.alert('投稿に失敗しました', (submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      setError(null);
      const uid = await ensureInteractionAllowed();

      if (!uid) {
        return;
      }

      await toggleLike(postId, uid);
    } catch (toggleError) {
      setError((toggleError as Error).message);
      Alert.alert('いいねに失敗しました', (toggleError as Error).message);
    }
  };

  const handleToggleReport = async (postId: string) => {
    try {
      setError(null);
      const uid = await ensureInteractionAllowed();

      if (!uid) {
        return;
      }

      const reported = await toggleReport(postId, uid);
      if (reported) {
        Alert.alert('通報しました', '3件以上通報されるとこの投稿は削除されます');
      } else {
        Alert.alert('通報を取り消しました');
      }
    } catch (toggleError) {
      setError((toggleError as Error).message);
      Alert.alert('通報に失敗しました', (toggleError as Error).message);
    }
  };

  const handleHidePost = async (postId: string) => {
    try {
      setError(null);
      const uid = await ensureInteractionAllowed();

      if (!uid) {
        return;
      }

      setHiddenPostIds((current) => new Set(current).add(postId));
      await hidePost(postId, uid);
    } catch (hideError) {
      setHiddenPostIds((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
      setError((hideError as Error).message);
      Alert.alert('非表示に失敗しました', (hideError as Error).message);
    }
  };

  const handleBlockUser = async (blockedUid: string) => {
    try {
      setError(null);
      const uid = await ensureInteractionAllowed();

      if (!uid) {
        return;
      }

      setBlockedUserIds((current) => new Set(current).add(blockedUid));
      await blockUser(blockedUid, uid);
    } catch (blockError) {
      setBlockedUserIds((current) => {
        const next = new Set(current);
        next.delete(blockedUid);
        return next;
      });
      setError((blockError as Error).message);
      Alert.alert('ブロックに失敗しました', (blockError as Error).message);
    }
  };

  const openPostMenu = (item: Post) => {
    Alert.alert('投稿メニュー', undefined, [
      {
        text: `この投稿を通報: ${item.reportCount}`,
        onPress: () => {
          void handleToggleReport(item.id);
        },
      },
      {
        text: 'この投稿を非表示',
        onPress: () => {
          void handleHidePost(item.id);
        },
      },
      ...(item.authorUid !== profile?.accountId
        ? [
            {
              text: '投稿者をブロック',
              onPress: () => {
                void handleBlockUser(item.authorUid);
              },
            },
          ]
        : []),
      { text: 'キャンセル', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, isAtTop ? styles.containerAtTop : styles.containerScrolled]}>
      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        style={styles.feed}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        onScroll={(event) => {
          const y = event.nativeEvent.contentOffset.y;
          setIsAtTop(y <= 0);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.composerCard}>
              <Text style={styles.heading}>投稿</Text>
              <TextInput
                style={styles.input}
                value={draftText}
                onChangeText={setDraftText}
                placeholder="投稿内容を入力"
                placeholderTextColor="#8a8a8a"
                multiline
              />
              <Pressable style={styles.postButton} onPress={() => void handleCreatePost()} disabled={isSubmitting}>
                <Text style={styles.postButtonText}>{isSubmitting ? '投稿中...' : '投稿する'}</Text>
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>投稿はまだありません</Text>}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeaderRow}>
              <Text style={styles.postMeta}>投稿者: {item.authorNickname}</Text>
              <Pressable style={styles.menuButton} onPress={() => openPostMenu(item)}>
                <Text style={styles.menuButtonText}>...</Text>
              </Pressable>
            </View>
            <Text style={styles.postText}>{item.text}</Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.actionButton} onPress={() => void handleToggleLike(item.id)}>
                <Text style={styles.actionButtonText}>🌸{item.likeCount}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f2ea',
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  containerAtTop: {
    paddingTop: 16,
  },
  containerScrolled: {
    paddingTop: 0,
  },
  feed: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  composerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c1f14',
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#d7cdc0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#2b2b2b',
    backgroundColor: '#fffdfb',
  },
  postButton: {
    backgroundColor: '#2f2214',
    borderRadius: 12,
    paddingVertical: 12,
  },
  postButtonText: {
    color: '#fff7ef',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
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
  listContent: {
    gap: 10,
    paddingBottom: 0,
  },
  listHeader: {
    gap: 12,
  },
  emptyText: {
    color: '#6f6559',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  postHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  postText: {
    color: '#2a2118',
    fontSize: 15,
    lineHeight: 21,
  },
  postMeta: {
    color: '#6a5b4d',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#d8c8b7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#58402d',
    fontSize: 13,
    fontWeight: '700',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1e7db',
  },
  menuButtonText: {
    color: '#58402d',
    fontSize: 18,
    fontWeight: '800',
    marginTop: -4,
  },
});
