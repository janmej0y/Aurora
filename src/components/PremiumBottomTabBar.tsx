import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Home, Droplets, ListChecks, CircleUserRound, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const useND = Platform.OS !== 'web';

// ─── Design tokens ────────────────────────────────────────────
const SURFACE_BG = '#151B23';
const BORDER = '#222B36';
const MUTED = '#94A3B8';
const EMERALD = '#22C55E';
const TEAL = '#14B8A6';
const DARK = '#090D14';

// Icon map for each route name
const ICONS: Record<string, typeof Home> = {
  Home,
  Water: Droplets,
  Habits: ListChecks,
  Profile: CircleUserRound,
};

// Labels (can differ from route names)
const LABELS: Record<string, string> = {
  Home: 'Home',
  Water: 'Water',
  AuroraAI: 'Aurora',
  Habits: 'Habits',
  Profile: 'Profile',
};

// ─── Types ────────────────────────────────────────────────────
type Props = {
  state: any;
  descriptors: any;
  navigation: any;
};

// ─── Component ────────────────────────────────────────────────
export function PremiumBottomTabBar({ state, descriptors, navigation }: Props) {
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.15)).current;

  // Keyboard listeners
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardUp(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardUp(false),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Subtle breathing pulse for center button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useND,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useND,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useND,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.12,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: useND,
        }),
      ]),
    ).start();
  }, []);

  if (keyboardUp) return null;

  // ── Navigation helpers ──────────────────────────────────────
  const press = (index: number) => {
    const route = state.routes[index];
    const focused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const openAuroraTalk = () => {
    const route = centerIndex >= 0 ? state.routes[centerIndex] : undefined;
    if (route) {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) {
        return;
      }
    }

    const params = {
      autoStartVoice: true,
      launchId: `talk-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
    const parentNavigation = navigation.getParent?.();

    if (parentNavigation?.navigate) {
      parentNavigation.navigate('Companion', params);
      return;
    }

    if (route) {
      navigation.navigate(route.name, params);
    }
  };

  // ── Identify center tab index (the Aurora AI tab) ───────────
  const centerIndex = state.routes.findIndex(
    (r: any) => r.name === 'AuroraAI',
  );
  const sideRoutes = state.routes.filter(
    (_: any, i: number) => i !== centerIndex,
  );
  const leftRoutes = sideRoutes.slice(0, 2);
  const rightRoutes = sideRoutes.slice(2, 4);

  // ── SVG concave cutout path ─────────────────────────────────
  const BAR_H = 72;
  const cutW = 78;
  const cutD = 30; // depth of the concave dip
  const midX = barWidth / 2;
  const sX = midX - cutW / 2;
  const eX = midX + cutW / 2;

  const barPath = barWidth > 0
    ? [
        `M 0 0`,
        `H ${sX}`,
        `C ${sX + 16} 0, ${midX - 22} ${cutD}, ${midX} ${cutD}`,
        `C ${midX + 22} ${cutD}, ${eX - 16} 0, ${eX} 0`,
        `H ${barWidth}`,
        `V ${BAR_H}`,
        `H 0`,
        `Z`,
      ].join(' ')
    : '';

  // ── Render a single tab item ────────────────────────────────
  const renderTab = (route: any, originalIndex: number) => {
    const focused = state.index === originalIndex;
    const Icon = ICONS[route.name];
    const label = LABELS[route.name] ?? route.name;

    if (!Icon) return null;

    return (
      <Pressable
        key={route.key}
        onPress={() => press(originalIndex)}
        style={s.tabItem}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        <View style={s.iconWrap}>
          <Icon
            size={21}
            color={focused ? EMERALD : MUTED}
            strokeWidth={focused ? 2 : 1.6}
          />
          {focused && <View style={s.dot} />}
        </View>
        <Text
          style={[
            s.label,
            { color: focused ? EMERALD : MUTED },
            focused && s.labelActive,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  // ── Render center Aurora AI button ──────────────────────────
  const renderCenter = () => {
    const glowOpacity = glowAnim;
    return (
      <View style={s.centerWrap}>
        {/* Ambient glow */}
        <Animated.View
          style={[
            s.glow,
            { opacity: glowOpacity, transform: [{ scale: pulseAnim }] },
          ]}
        />
        {/* Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            onPress={openAuroraTalk}
            style={({ pressed }) => [
              s.centerBtn,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityLabel="Talk to Aurora"
            accessibilityHint="Opens Aurora and starts voice recording"
          >
            <LinearGradient
              colors={[EMERALD, TEAL]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.gradFill}
            >
              <Sparkles size={22} color={DARK} strokeWidth={2.2} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  return (
    <View
      style={s.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setBarWidth(w - 32); // 16px margin each side
      }}
    >
      {barWidth > 0 && (
        <View style={[s.dock, { width: barWidth }]}>
          {/* SVG background with concave cutout */}
          <View style={StyleSheet.absoluteFill}>
            <Svg
              width={barWidth}
              height={BAR_H}
              viewBox={`0 0 ${barWidth} ${BAR_H}`}
            >
              <Path
                d={barPath}
                fill={SURFACE_BG}
                stroke={BORDER}
                strokeWidth={1}
              />
            </Svg>
          </View>

          {/* Tab items row */}
          <View style={s.row}>
            {/* Left side tabs */}
            {leftRoutes.map((route: any) => {
              const origIdx = state.routes.findIndex(
                (r: any) => r.key === route.key,
              );
              return renderTab(route, origIdx);
            })}

            {/* Spacer for center button */}
            <View style={s.spacer} />

            {/* Right side tabs */}
            {rightRoutes.map((route: any) => {
              const origIdx = state.routes.findIndex(
                (r: any) => r.key === route.key,
              );
              return renderTab(route, origIdx);
            })}
          </View>

          {/* Floating center button */}
          {renderCenter()}
        </View>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  dock: {
    height: 72,
    overflow: 'visible',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    height: 72,
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 10,
    paddingBottom: 6,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: EMERALD,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '600',
  },
  spacer: {
    width: 72,
  },
  centerWrap: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -30 }],
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  glow: {
    position: 'absolute',
    borderRadius: 40,
    backgroundColor: EMERALD,
    // Expand glow beyond button
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    width: undefined,
    height: undefined,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  gradFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
