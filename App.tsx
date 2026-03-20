import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { acceptTerms, confirmAge, getConsentState } from './src/lib/consent';
import { hasFirebaseConfig, requireAuth } from './src/lib/firebase';
import { AccountScreen } from './src/screens/AccountScreen';
import { AgeGateScreen } from './src/screens/AgeGateScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TermsGateScreen } from './src/screens/TermsGateScreen';

type RootStackParamList = {
  AgeGate: undefined;
  TermsGate: undefined;
  AuthGate: undefined;
  MainTabs: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f6f1ea',
    card: '#fffdf8',
    text: '#23180f',
    border: '#e7dbcd',
    primary: '#2f2214',
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fffdf8',
          borderBottomColor: '#eadfce',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: '#23180f',
        },
        tabBarActiveTintColor: '#2f2214',
        tabBarInactiveTintColor: '#857868',
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: '#fffdf8',
          borderTopColor: '#eadfce',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '吃音村広場',
          tabBarLabel: '吃音村広場',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🌳</Text>,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'アカウント',
          tabBarLabel: 'アカウント',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2f2214" />
      <Text style={styles.loadingText}>初期状態を確認しています...</Text>
    </View>
  );
}

export default function App() {
  const [consentState, setConsentState] = useState<{
    ageConfirmed: boolean;
    termsAccepted: boolean;
  } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(!hasFirebaseConfig);
  const [isSignedIn, setIsSignedIn] = useState(!hasFirebaseConfig);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setIsAuthReady(true);
      setIsSignedIn(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(requireAuth(), (user) => {
      setIsSignedIn(Boolean(user));
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const nextConsentState = await getConsentState();

      if (mounted) {
        setConsentState(nextConsentState);
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirmAge = async () => {
    await confirmAge();
    setConsentState((currentState) => ({
      ageConfirmed: true,
      termsAccepted: currentState?.termsAccepted ?? false,
    }));
  };

  const handleAcceptTerms = async () => {
    await acceptTerms();
    setConsentState((currentState) => ({
      ageConfirmed: currentState?.ageConfirmed ?? true,
      termsAccepted: true,
    }));
  };

  if (!consentState || !isAuthReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <LoadingScreen />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!consentState.ageConfirmed ? (
              <Stack.Screen name="AgeGate">
                {() => <AgeGateScreen onConfirm={handleConfirmAge} />}
              </Stack.Screen>
            ) : null}
            {consentState.ageConfirmed && !consentState.termsAccepted ? (
              <Stack.Screen name="TermsGate">
                {() => <TermsGateScreen onAccept={handleAcceptTerms} />}
              </Stack.Screen>
            ) : null}
            {consentState.ageConfirmed && consentState.termsAccepted && !isSignedIn ? (
              <Stack.Screen name="AuthGate" component={AuthScreen} />
            ) : null}
            {consentState.ageConfirmed && consentState.termsAccepted && isSignedIn ? (
              <Stack.Screen name="MainTabs" component={MainTabs} />
            ) : null}
          </Stack.Navigator>
          <StatusBar style="dark" />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f1ea',
    gap: 14,
  },
  loadingText: {
    color: '#433122',
    fontSize: 15,
    fontWeight: '600',
  },
});
