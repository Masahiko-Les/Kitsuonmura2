import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteField, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { hasFirebaseConfig, requireAuth, requireFirestore } from './firebase';

export const AGE_CONFIRMED_KEY = 'ageConfirmed_v1';
export const TERMS_ACCEPTED_KEY = 'termsAccepted_v1';
export const TERMS_URL = 'https://apricot-turret-50e.notion.site/31505149608d80749ddddacc26be0c98';
export const SUPPORT_URL = 'https://apricot-turret-50e.notion.site/30c05149608d80a9bcc8f3dba2f75a75';

export type ConsentState = {
  ageConfirmed: boolean;
  termsAccepted: boolean;
};

function normalizeConsentState(data: Record<string, unknown> | undefined): ConsentState {
  if (!data) {
    return {
      ageConfirmed: false,
      termsAccepted: false,
    };
  }

  const ageConfirmed =
    data.ageConfirmed === true || (data.ageConfirmedAt !== null && data.ageConfirmedAt !== undefined);
  const termsAccepted =
    data.termsAccepted === true || (data.termsAcceptedAt !== null && data.termsAcceptedAt !== undefined);

  return {
    ageConfirmed,
    termsAccepted,
  };
}

async function getLocalConsentState(): Promise<ConsentState> {
  const [ageConfirmed, termsAccepted] = await Promise.all([
    AsyncStorage.getItem(AGE_CONFIRMED_KEY),
    AsyncStorage.getItem(TERMS_ACCEPTED_KEY),
  ]);

  return {
    ageConfirmed: ageConfirmed === 'true',
    termsAccepted: termsAccepted === 'true',
  };
}

async function setLocalConsentState(state: Partial<ConsentState>): Promise<void> {
  const operations: Promise<void>[] = [];

  if (typeof state.ageConfirmed === 'boolean') {
    operations.push(
      state.ageConfirmed
        ? AsyncStorage.setItem(AGE_CONFIRMED_KEY, 'true')
        : AsyncStorage.removeItem(AGE_CONFIRMED_KEY),
    );
  }

  if (typeof state.termsAccepted === 'boolean') {
    operations.push(
      state.termsAccepted
        ? AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true')
        : AsyncStorage.removeItem(TERMS_ACCEPTED_KEY),
    );
  }

  await Promise.all(operations);
}

async function syncConsentStateToFirestore(state: Partial<ConsentState>): Promise<void> {
  if (!hasFirebaseConfig) {
    return;
  }

  const user = requireAuth().currentUser;

  if (!user) {
    return;
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof state.ageConfirmed === 'boolean') {
    payload.ageConfirmed = state.ageConfirmed;
    payload.ageConfirmedAt = state.ageConfirmed ? serverTimestamp() : deleteField();
  }

  if (typeof state.termsAccepted === 'boolean') {
    payload.termsAccepted = state.termsAccepted;
    payload.termsAcceptedAt = state.termsAccepted ? serverTimestamp() : deleteField();
  }

  await setDoc(doc(requireFirestore(), 'users', user.uid), payload, { merge: true });
}

async function migrateLocalConsentIfNeeded(remoteState: ConsentState): Promise<ConsentState> {
  const localState = await getLocalConsentState();
  const nextState: Partial<ConsentState> = {};

  if (!remoteState.ageConfirmed && localState.ageConfirmed) {
    nextState.ageConfirmed = true;
  }

  if (!remoteState.termsAccepted && localState.termsAccepted) {
    nextState.termsAccepted = true;
  }

  if (Object.keys(nextState).length === 0) {
    return remoteState;
  }

  await syncConsentStateToFirestore(nextState);
  return {
    ageConfirmed: remoteState.ageConfirmed || localState.ageConfirmed,
    termsAccepted: remoteState.termsAccepted || localState.termsAccepted,
  };
}

export async function getConsentState(): Promise<ConsentState> {
  if (!hasFirebaseConfig) {
    return getLocalConsentState();
  }

  const user = requireAuth().currentUser;

  if (!user) {
    return {
      ageConfirmed: false,
      termsAccepted: false,
    };
  }

  try {
    const snapshot = await getDoc(doc(requireFirestore(), 'users', user.uid));
    const remoteState = normalizeConsentState(snapshot.exists() ? snapshot.data() : undefined);
    const nextState = await migrateLocalConsentIfNeeded(remoteState);
    await setLocalConsentState(nextState);
    return nextState;
  } catch {
    return getLocalConsentState();
  }
}

export async function confirmAge(): Promise<void> {
  await setLocalConsentState({ ageConfirmed: true });
  await syncConsentStateToFirestore({ ageConfirmed: true });
}

export async function clearAgeConfirmation(): Promise<void> {
  await setLocalConsentState({ ageConfirmed: false });
  await syncConsentStateToFirestore({ ageConfirmed: false });
}

export async function acceptTerms(): Promise<void> {
  await setLocalConsentState({ termsAccepted: true });
  await syncConsentStateToFirestore({ termsAccepted: true });
}

export async function clearTermsAcceptance(): Promise<void> {
  await setLocalConsentState({ termsAccepted: false });
  await syncConsentStateToFirestore({ termsAccepted: false });
}

export async function resetConsent(): Promise<void> {
  await AsyncStorage.multiRemove([AGE_CONFIRMED_KEY, TERMS_ACCEPTED_KEY]);
}
