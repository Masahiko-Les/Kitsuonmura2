import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type DocumentData,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  type QueryDocumentSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { assertUserNotBanned } from './account';
import { requireFirestore } from '../lib/firebase';

export type AuthorSummary = {
  uid: string;
  nickname: string;
};

export type Post = {
  id: string;
  text: string;
  authorUid: string;
  authorNickname: string;
  createdAtMs: number;
  isHidden: boolean;
  likeCount: number;
  reportCount: number;
};

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

function mapPost(snapshot: QueryDocumentSnapshot<DocumentData>): Post {
  const data = snapshot.data() as DocumentData;

  if (!data) {
    throw new Error('Post data is missing.');
  }

  return {
    id: snapshot.id,
    text: typeof data.text === 'string' ? data.text : '',
    authorUid: typeof data.authorUid === 'string' ? data.authorUid : '',
    authorNickname: typeof data.authorNickname === 'string' ? data.authorNickname : 'ゲスト',
    createdAtMs: readMillis(data.createdAtMs) ?? Date.now(),
    isHidden: data.isHidden === true,
    likeCount: typeof data.likeCount === 'number' ? data.likeCount : 0,
    reportCount: typeof data.reportCount === 'number' ? data.reportCount : 0,
  } satisfies Post;
}

export function subscribeToPosts(
  onUpdate: (posts: Post[]) => void,
  onError?: (error: Error) => void,
): () => void {
  try {
    const db = requireFirestore();
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAtMs', 'desc'),
      limit(50),
    );

    return onSnapshot(
      postsQuery,
      (snapshot) => {
        const posts = snapshot.docs
          .map((item) => mapPost(item))
          .filter((post) => !post.isHidden);
        onUpdate(posts);
      },
      (error) => {
        onError?.(error);
      },
    );
  } catch (error) {
    onUpdate([]);
    onError?.(error as Error);
    return () => undefined;
  }
}

export async function createPost(content: string, author: AuthorSummary): Promise<void> {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error('投稿内容を入力してください。');
  }

  await assertUserNotBanned(author.uid);
  const db = requireFirestore();

  await addDoc(collection(db, 'posts'), {
    text: trimmed,
    authorUid: author.uid,
    authorNickname: author.nickname.trim() || 'ゲスト',
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
    isHidden: false,
    likeCount: 0,
    reportCount: 0,
  });
}

export async function updatePost(
  postId: string,
  content: string,
  authorUid: string,
): Promise<void> {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error('投稿内容を入力してください。');
  }

  const db = requireFirestore();
  const postRef = doc(db, 'posts', postId);
  const snapshot = await getDoc(postRef);

  if (!snapshot.exists()) {
    throw new Error('対象の投稿が見つかりません。');
  }

  const data = snapshot.data();

  if (data.authorUid !== authorUid) {
    throw new Error('自分の投稿だけ編集できます。');
  }

  await updateDoc(postRef, {
    text: trimmed,
    createdAtMs: Date.now(),
  });
}

export async function deletePost(postId: string, authorUid: string): Promise<void> {
  const db = requireFirestore();
  const postRef = doc(db, 'posts', postId);
  const snapshot = await getDoc(postRef);

  if (!snapshot.exists()) {
    return;
  }

  const data = snapshot.data();

  if (data.authorUid !== authorUid) {
    throw new Error('自分の投稿だけ削除できます。');
  }

  await deleteDoc(postRef);
}
