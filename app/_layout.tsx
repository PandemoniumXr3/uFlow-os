import { useFonts } from 'expo-font';
import { DarkTheme, Redirect, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { UndoBanner } from '@/components/ui/UndoBanner';
import { colors } from '@/constants/theme';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { UndoProvider } from '@/contexts/UndoContext';
import { useProfile } from '@/hooks/useProfile';

export { AppErrorBoundary as ErrorBoundary };

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// uFlow always runs in its own dark, charcoal theme — no system light/dark switching.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accentBlue,
  },
};

/**
 * Reads the one shared ProfileContext instance (not a separate hook copy)
 * so this routing decision always sees the same state every other screen
 * — including the onboarding screen that flips it to completed — is
 * looking at. See ProfileContext's own docblock for the bug this fixes.
 */
function RootNavigator() {
  const { profile, isLoading: profileLoading } = useProfile();
  const pathname = usePathname();

  if (profileLoading || !profile) {
    return null;
  }

  // 'skipped' counts the same as 'completed' for routing — see useProfile's skipOnboarding.
  const needsOnboarding = profile.onboarding?.status === 'not_started' || profile.onboarding?.status === 'in_progress';

  // Web resolves routes from the URL, not from Stack's initialRouteName (that prop only affects
  // native's "first screen when there's no deep link") — so the redirect must be explicit and must
  // work from any entry route, not just the default one. Once already on /onboarding this condition
  // is false, so the Stack below renders normally and the onboarding screen's content actually shows.
  if (needsOnboarding && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <ProfileProvider>
        <UndoProvider>
          <RootNavigator />
          <UndoBanner />
        </UndoProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
