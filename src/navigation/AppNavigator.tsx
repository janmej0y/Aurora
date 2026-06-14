import { useEffect, useRef, useState } from 'react';
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BedDouble, Droplets, Home, ListChecks, CircleUserRound, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Animated, Easing, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const useND = Platform.OS !== 'web';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { PremiumBottomTabBar } from '../components/PremiumBottomTabBar';

import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import { AuthScreen } from '../screens/AuthScreen';
import { CompanionScreen } from '../screens/CompanionScreen';
import { HabitsScreen } from '../screens/HabitsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { HydrationScreen } from '../screens/HydrationScreen';
import { IntroScreen } from '../screens/IntroScreen';
import { NutritionScreen } from '../screens/NutritionScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SleepScreen } from '../screens/SleepScreen';
import { TrackingSetupScreen } from '../screens/TrackingSetupScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { DeviceIntegrationsScreen } from '../screens/DeviceIntegrationsScreen';
import { useHealth } from '../store/HealthContext';
import { RootStackParamList, TabParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Dark nav theme
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.emerald,
    card: colors.surface,
    border: colors.border,
    text: colors.ink,
    notification: colors.emerald,
  },
};

type TabIconProps = {
  icon: typeof Home;
  focused: boolean;
  color: string;
};

function TabIcon({ icon: Icon, focused, color }: TabIconProps) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Icon
        size={19}
        color={focused ? colors.background : color}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
}

function FloatingAuraButton({ onPress }: { onPress: () => void }) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useND,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useND,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useND,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: useND,
        }),
      ])
    ).start();
  }, []);

  if (keyboardVisible) return null;

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.3, 0],
  });

  return (
    <Animated.View style={[tabStyles.floatBtnWrap, { transform: [{ scale: pulseAnim }] }]}>
      <Animated.View
        style={[
          tabStyles.floatBtnGlow,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={tabStyles.floatBtn}
        accessibilityLabel="Talk to Aurora"
      >
        <LinearGradient
          colors={['#22C55E', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={tabStyles.floatBtnGradient}
        >
          <Sparkles size={20} color="#090D14" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MainTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0D1117' }}>
      <Tab.Navigator
        tabBar={(props) => <PremiumBottomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Water" component={HydrationScreen} />
        <Tab.Screen name="AuroraAI" component={CompanionScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

function LoadingGate() {
  return (
    <View style={tabStyles.loading}>
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Circle cx={20} cy={20} r={16} fill="none" stroke={colors.track} strokeWidth={3} />
        <Circle cx={20} cy={20} r={16} fill="none" stroke={colors.emerald} strokeWidth={3}
          strokeDasharray="40 60" strokeLinecap="round" transform="rotate(-90 20 20)" />
      </Svg>
      <Text style={tabStyles.loadingText}>Aurora</Text>
      <ActivityIndicator color={colors.emerald} />
    </View>
  );
}

export function AppNavigator() {
  const { state, ready } = useHealth();

  if (!ready) return <LoadingGate />;

  // Determine which "gate" the user is in
  const showIntro     = !state.hasSeenIntro;
  const showAuth      = state.hasSeenIntro && !state.isAuthenticated;
  const showOnboarding = state.isAuthenticated && !state.hasCompletedOnboarding;
  const showTracking  = state.isAuthenticated && state.hasCompletedOnboarding && !state.hasConfiguredTracking;
  const showMain      = state.isAuthenticated && state.hasCompletedOnboarding && state.hasConfiguredTracking;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {showIntro && (
          <Stack.Screen name="Intro" component={IntroScreen} />
        )}
        {showAuth && (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
        {showOnboarding && (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
        {showTracking && (
          <Stack.Screen name="TrackingSetup" component={TrackingSetupScreen} />
        )}
        {showMain && (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Companion" component={CompanionScreen} />
            <Stack.Screen name="Sleep" component={SleepScreen} />
            <Stack.Screen name="Nutrition" component={NutritionScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="DeviceIntegrations" component={DeviceIntegrationsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    height: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    ...shadow,
  },
  item: {
    borderRadius: radius.md,
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  iconWrap: {
    width: 32,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.emerald,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  loadingText: {
    color: colors.ink,
    fontSize: type.section,
    fontWeight: fontWeight.black,
    letterSpacing: 2,
  },
  floatBtnWrap: {
    position: 'absolute',
    bottom: 96,
    left: '50%',
    marginLeft: -26,
    width: 52,
    height: 52,
    zIndex: 999,
  },
  floatBtnGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#22C55E',
    zIndex: -1,
  },
  floatBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    ...shadow,
  },
  floatBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
