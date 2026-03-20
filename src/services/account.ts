import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { AGE_CONFIRMED_KEY, TERMS_ACCEPTED_KEY } from '../lib/consent';
import { hasFirebaseConfig, requireAuth, requireFirestore } from '../lib/firebase';

const ACCOUNT_ID_KEY = 'deviceAccountId_v1';
const NICKNAME_KEY = 'nickname_v1';
const DEFAULT_NICKNAME = 'ゲスト';

export type BanStatus = {
  isBanned: boolean;
  reason: string | null;
  bannedUntil: number | null;
};

export type AccountProfile = {
  accountId: string;
  email: string | null;
  nickname: string;
  banStatus: BanStatus;
  deletedAt: number | null;
};

export type EmailAuthInput = {
  email: string;
  password: string;
};

function createLocalAccountId(): string {
  return `acct_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readMillis(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis();
  }

  return null;
}

async function readLocalNickname(): Promise<string> {
  const nickname = await AsyncStorage.getItem(NICKNAME_KEY);
  return nickname?.trim() || DEFAULT_NICKNAME;
}

function normalizeBanStatus(data: Record<string, unknown> | undefined): BanStatus {
  if (!data) {
    return {
      isBanned: false,
      reason: null,
      bannedUntil: null,
    };
  }

  const bannedUntil = readMillis(data.bannedUntil);
  const reason = typeof data.banReason === 'string' ? data.banReason : null;
  const bannedFlag = data.banned === true;

  return {
    isBanned: bannedFlag || (typeof bannedUntil === 'number' && bannedUntil > Date.now()),
    reason,
    bannedUntil,
  };
}

async function readBanStatus(uid: string): Promise<BanStatus> {
  if (!hasFirebaseConfig) {
    return {
      isBanned: false,
      reason: null,
      bannedUntil: null,
    };
  }

  try {
    const db = requireFirestore();
    const snapshot = await getDoc(doc(db, 'bannedUsers', uid));

    if (!snapshot.exists()) {
      return {
        isBanned: false,
        reason: null,
        bannedUntil: null,
      };
    }

    return normalizeBanStatus(snapshot.data());
  } catch {
    return {
      isBanned: false,
      reason: null,
      bannedUntil: null,
    };
  }
}

async function hideOwnPosts(uid: string): Promise<void> {
  const db = requireFirestore();
  const snapshot = await getDocs(query(collection(db, 'posts'), where('authorUid', '==', uid)));

  if (snapshot.empty) {
    return;
  }

  let batch = writeBatch(db);
  let operationCount = 0;

  for (const item of snapshot.docs) {
    batch.update(item.ref, {
      isHidden: true,
      hiddenAt: serverTimestamp(),
      hiddenReason: 'user_deleted',
    });
    operationCount += 1;

    if (operationCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

async function deleteUserSubcollection(uid: string, collectionName: 'hiddenPosts' | 'blockedUsers'): Promise<void> {
  const db = requireFirestore();
  const snapshot = await getDocs(collection(db, 'users', uid, collectionName));

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);

  for (const item of snapshot.docs) {
    batch.delete(item.ref);
  }

  await batch.commit();
}

export async function getOrCreateAccountId(): Promise<string> {
  const stored = await AsyncStorage.getItem(ACCOUNT_ID_KEY);

  if (stored) {
    return stored;
  }

  const nextId = createLocalAccountId();
  await AsyncStorage.setItem(ACCOUNT_ID_KEY, nextId);
  return nextId;
}

export async function hasRegisteredNickname(): Promise<boolean> {
  const nickname = await AsyncStorage.getItem(NICKNAME_KEY);
  return typeof nickname === 'string' && nickname.trim().length > 0;
}

function mapAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。';
    case 'auth/missing-password':
      return 'パスワードを入力してください。';
    case 'auth/weak-password':
      return 'パスワードは6文字以上で入力してください。';
    case 'auth/email-already-in-use':
      return 'このメールアドレスは既に登録されています。';
    case 'auth/invalid-credential':
      return 'メールアドレスまたはパスワードが正しくありません。';
    case 'auth/user-not-found':
      return 'このメールアドレスのユーザーは見つかりません。';
    case 'auth/wrong-password':
      return 'パスワードが違います。';
    case 'auth/too-many-requests':
      return '試行回数が上限に達しました。時間をおいて再試行してください。';
    case 'auth/network-request-failed':
      return 'ネットワークエラーが発生しました。通信環境を確認してください。';
    default:
      return (error as Error)?.message ?? '認証に失敗しました。';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmailAuthInput(input: EmailAuthInput): { email: string; password: string } {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!email) {
    throw new Error('メールアドレスを入力してください。');
  }

  if (!password) {
    throw new Error('パスワードを入力してください。');
  }

  return { email, password };
}

export async function registerWithEmail(input: EmailAuthInput): Promise<User> {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase設定が未完了のため認証できません。');
  }

  const { email, password } = validateEmailAuthInput(input);
  const auth = requireAuth();

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(mapAuthErrorMessage(error));
  }
}

export async function signInWithEmail(input: EmailAuthInput): Promise<User> {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase設定が未完了のため認証できません。');
  }

  const { email, password } = validateEmailAuthInput(input);
  const auth = requireAuth();

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(mapAuthErrorMessage(error));
  }
}

export async function resetPassword(emailInput: string): Promise<void> {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase設定が未完了のため認証できません。');
  }

  const email = normalizeEmail(emailInput);

  if (!email) {
    throw new Error('メールアドレスを入力してください。');
  }

  try {
    await sendPasswordResetEmail(requireAuth(), email);
  } catch (error) {
    throw new Error(mapAuthErrorMessage(error));
  }
}

export async function logout(): Promise<void> {
  if (!hasFirebaseConfig) {
    return;
  }

  try {
    await signOut(requireAuth());
  } catch (error) {
    throw new Error(mapAuthErrorMessage(error));
  }
}

export function requireAuthenticatedUser(): User {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase設定が未完了のため認証機能を利用できません。');
  }

  const auth = requireAuth();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  throw new Error('ログインしてください。');
}

export async function getAccountProfile(): Promise<AccountProfile> {
  const localNickname = await readLocalNickname();

  if (!hasFirebaseConfig) {
    const accountId = await getOrCreateAccountId();
    return {
      accountId,
      email: null,
      nickname: localNickname,
      banStatus: {
        isBanned: false,
        reason: null,
        bannedUntil: null,
      },
      deletedAt: null,
    };
  }

  const user = requireAuthenticatedUser();
  const accountId = user.uid;
  const db = requireFirestore();
  const accountRef = doc(db, 'users', accountId);
  const [snapshot, banStatus] = await Promise.all([getDoc(accountRef), readBanStatus(accountId)]);

  if (!snapshot.exists()) {
    await setDoc(accountRef, {
      nickname: localNickname,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      accountId,
      email: user.email,
      nickname: localNickname,
      banStatus,
      deletedAt: null,
    };
  }

  const data = snapshot.data();
  const remoteNickname = typeof data.nickname === 'string' ? data.nickname.trim() : '';
  const nickname = remoteNickname || localNickname;

  if (nickname !== localNickname) {
    await AsyncStorage.setItem(NICKNAME_KEY, nickname);
  }

  return {
    accountId,
    email: user.email,
    nickname,
    banStatus,
    deletedAt: readMillis(data.deletedAt),
  };
}

export async function updateNickname(nickname: string): Promise<void> {
  const trimmed = nickname.trim();

  if (!trimmed) {
    throw new Error('ニックネームを入力してください。');
  }

  await AsyncStorage.setItem(NICKNAME_KEY, trimmed);

  if (!hasFirebaseConfig) {
    return;
  }

  const user = requireAuthenticatedUser();
  const accountId = user.uid;
  const db = requireFirestore();
  await setDoc(
    doc(db, 'users', accountId),
    {
      nickname: trimmed,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function checkBanStatus(): Promise<BanStatus> {
  if (!hasFirebaseConfig) {
    return {
      isBanned: false,
      reason: null,
      bannedUntil: null,
    };
  }

  const user = requireAuthenticatedUser();
  return readBanStatus(user.uid);
}

export async function assertUserNotBanned(uid: string): Promise<void> {
  const banStatus = await readBanStatus(uid);

  if (banStatus.isBanned) {
    throw new Error('利用停止中のためこの操作は実行できません。');
  }
}

export async function deleteAccount(): Promise<void> {
  if (hasFirebaseConfig) {
    const user = requireAuthenticatedUser();
    const accountId = user.uid;
    const db = requireFirestore();
    await hideOwnPosts(accountId);
    await Promise.all([
      deleteUserSubcollection(accountId, 'hiddenPosts'),
      deleteUserSubcollection(accountId, 'blockedUsers'),
    ]);
    await deleteDoc(doc(db, 'users', accountId));
    await user.delete();
  }

  await AsyncStorage.multiRemove([
    ACCOUNT_ID_KEY,
    NICKNAME_KEY,
    AGE_CONFIRMED_KEY,
    TERMS_ACCEPTED_KEY,
  ]);
}
