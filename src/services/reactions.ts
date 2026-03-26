import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';

import { assertUserNotBanned } from './account';
import { requireFirestore } from '../lib/firebase';

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function toggleLike(postId: string, uid: string): Promise<boolean> {
  const db = requireFirestore();
  const postRef = doc(db, 'posts', postId);
  const likeRef = doc(db, 'posts', postId, 'likes', uid);

  await assertUserNotBanned(uid);

  return runTransaction(db, async (transaction) => {
    const [postSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(likeRef),
    ]);

    if (!postSnapshot.exists()) {
      throw new Error('対象の投稿が見つかりません。');
    }

    const currentLikeCount = numberOrZero(postSnapshot.data().likeCount);

    if (likeSnapshot.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, {
        likeCount: Math.max(0, currentLikeCount - 1),
      });
      return false;
    }

    transaction.set(likeRef, {
      uid,
      createdAt: serverTimestamp(),
    });
    transaction.update(postRef, {
      likeCount: currentLikeCount + 1,
    });
    return true;
  });
}

export async function toggleReport(
  postId: string,
  uid: string,
  reason = 'user_report',
): Promise<boolean> {
  const db = requireFirestore();
  const postRef = doc(db, 'posts', postId);
  const reportRef = doc(db, 'posts', postId, 'reports', uid);

  await assertUserNotBanned(uid);

  return runTransaction(db, async (transaction) => {
    const [postSnapshot, reportSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(reportRef),
    ]);

    if (!postSnapshot.exists()) {
      throw new Error('対象の投稿が見つかりません。');
    }

    const currentReportCount = numberOrZero(postSnapshot.data().reportCount);

    if (reportSnapshot.exists()) {
      transaction.delete(reportRef);
      transaction.update(postRef, {
        reportCount: Math.max(0, currentReportCount - 1),
      });
      return false;
    }

    const nextReportCount = currentReportCount + 1;
    transaction.set(reportRef, {
      uid,
      reason,
      createdAt: serverTimestamp(),
    });
    transaction.update(postRef, {
      reportCount: nextReportCount,
      ...(nextReportCount >= 3
        ? {
            isHidden: true,
            hiddenAt: serverTimestamp(),
            hiddenReason: 'report_threshold',
          }
        : {}),
    });
    return true;
  });
}

export async function hidePost(postId: string, uid: string): Promise<void> {
  const db = requireFirestore();

  await assertUserNotBanned(uid);
  await setDoc(doc(db, 'users', uid, 'hiddenPosts', postId), {
    postId,
    createdAt: serverTimestamp(),
  });
}

export async function blockUser(blockedUid: string, uid: string): Promise<void> {
  if (blockedUid === uid) {
    return;
  }

  const db = requireFirestore();

  await assertUserNotBanned(uid);
  await setDoc(doc(db, 'users', uid, 'blockedUsers', blockedUid), {
    blockedUid,
    createdAt: serverTimestamp(),
  });
}

export function subscribeHiddenPostIds(
  uid: string,
  onUpdate: (ids: Set<string>) => void,
  onError?: (error: Error) => void,
): () => void {
  const db = requireFirestore();

  return onSnapshot(
    collection(db, 'users', uid, 'hiddenPosts'),
    (snapshot) => {
      onUpdate(new Set(snapshot.docs.map((item) => item.id)));
    },
    (error) => {
      onError?.(error);
    },
  );
}

export function subscribeBlockedUserIds(
  uid: string,
  onUpdate: (ids: Set<string>) => void,
  onError?: (error: Error) => void,
): () => void {
  const db = requireFirestore();

  return onSnapshot(
    collection(db, 'users', uid, 'blockedUsers'),
    (snapshot) => {
      onUpdate(new Set(snapshot.docs.map((item) => item.id)));
    },
    (error) => {
      onError?.(error);
    },
  );
}
