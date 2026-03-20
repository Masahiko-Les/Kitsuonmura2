import AsyncStorage from '@react-native-async-storage/async-storage';

export const AGE_CONFIRMED_KEY = 'ageConfirmed_v1';
export const TERMS_ACCEPTED_KEY = 'termsAccepted_v1';
export const TERMS_URL = 'https://apricot-turret-50e.notion.site/31505149608d80749ddddacc26be0c98';
export const SUPPORT_URL = 'https://apricot-turret-50e.notion.site/30c05149608d80a9bcc8f3dba2f75a75';

export type ConsentState = {
  ageConfirmed: boolean;
  termsAccepted: boolean;
};

export async function getConsentState(): Promise<ConsentState> {
  const [ageConfirmed, termsAccepted] = await Promise.all([
    AsyncStorage.getItem(AGE_CONFIRMED_KEY),
    AsyncStorage.getItem(TERMS_ACCEPTED_KEY),
  ]);

  return {
    ageConfirmed: ageConfirmed === 'true',
    termsAccepted: termsAccepted === 'true',
  };
}

export async function confirmAge(): Promise<void> {
  await AsyncStorage.setItem(AGE_CONFIRMED_KEY, 'true');
}

export async function clearAgeConfirmation(): Promise<void> {
  await AsyncStorage.removeItem(AGE_CONFIRMED_KEY);
}

export async function acceptTerms(): Promise<void> {
  await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
}

export async function clearTermsAcceptance(): Promise<void> {
  await AsyncStorage.removeItem(TERMS_ACCEPTED_KEY);
}

export async function resetConsent(): Promise<void> {
  await AsyncStorage.multiRemove([AGE_CONFIRMED_KEY, TERMS_ACCEPTED_KEY]);
}
