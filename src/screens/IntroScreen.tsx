import { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, G, Rect } from 'react-native-svg';
import { colors, fontWeight, radius, shadow, spacing, type } from '../theme/tokens';
import { useHealth } from '../store/HealthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function IntroScreen() {
  const { setSeenIntro } = useHealth();

  return (
    <SafeAreaView style={introStyles.screen}>
      {/* Dynamic Aurora Sky and Mountains background via SVG */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}>
          <Defs>
            {/* Sky Gradient */}
            <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#080B11" />
              <Stop offset="60%" stopColor="#0E1726" />
              <Stop offset="100%" stopColor="#080C14" />
            </LinearGradient>

            {/* Aurora Light Glow */}
            <LinearGradient id="auroraGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#10B981" stopOpacity="0.0" />
              <Stop offset="30%" stopColor="#06B6D4" stopOpacity="0.18" />
              <Stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#EC4899" stopOpacity="0.0" />
            </LinearGradient>

            {/* Logo Ring Gradient */}
            <LinearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#8B5CF6" />
              <Stop offset="50%" stopColor="#06B6D4" />
              <Stop offset="100%" stopColor="#10B981" />
            </LinearGradient>

            {/* Button Gradient */}
            <LinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#6366F1" />
              <Stop offset="100%" stopColor="#06B6D4" />
            </LinearGradient>
          </Defs>

          {/* Sky background */}
          <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#skyGrad)" />

          {/* Aurora glow stripe */}
          <Path
            d={`M 0 ${SCREEN_HEIGHT * 0.45} Q ${SCREEN_WIDTH * 0.4} ${SCREEN_HEIGHT * 0.2} ${SCREEN_WIDTH} ${SCREEN_HEIGHT * 0.45} L ${SCREEN_WIDTH} ${SCREEN_HEIGHT} L 0 ${SCREEN_HEIGHT} Z`}
            fill="url(#auroraGlow)"
          />

          {/* Mountain Silhouette at bottom */}
          <Path
            d={`M 0 ${SCREEN_HEIGHT * 0.85} L ${SCREEN_WIDTH * 0.25} ${SCREEN_HEIGHT * 0.72} L ${SCREEN_WIDTH * 0.55} ${SCREEN_HEIGHT * 0.8} L ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.68} L ${SCREEN_WIDTH} ${SCREEN_HEIGHT * 0.78} L ${SCREEN_WIDTH} ${SCREEN_HEIGHT} L 0 ${SCREEN_HEIGHT} Z`}
            fill="#05080E"
          />
          <Path
            d={`M 0 ${SCREEN_HEIGHT * 0.88} L ${SCREEN_WIDTH * 0.35} ${SCREEN_HEIGHT * 0.78} L ${SCREEN_WIDTH * 0.7} ${SCREEN_HEIGHT * 0.83} L ${SCREEN_WIDTH} ${SCREEN_HEIGHT * 0.75} L ${SCREEN_WIDTH} ${SCREEN_HEIGHT} L 0 ${SCREEN_HEIGHT} Z`}
            fill="#020306"
            opacity="0.9"
          />
        </Svg>
      </View>

      {/* Main Content Area */}
      <View style={introStyles.content}>
        {/* Glowing Logo Circle */}
        <View style={introStyles.logoWrap}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            {/* Background ring */}
            <Circle cx={60} cy={60} r={50} fill="none" stroke="#202633" strokeWidth={1} />
            {/* Gradient glow ring */}
            <Circle
              cx={60}
              cy={60}
              r={46}
              fill="none"
              stroke="url(#logoGrad)"
              strokeWidth={3}
              strokeDasharray="290"
              strokeDashoffset="60"
              strokeLinecap="round"
            />
            {/* Inner dynamic content */}
            <Circle cx={60} cy={60} r={32} fill="#090D14" />
          </Svg>
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={introStyles.logoCenterText}>4</Text>
          </View>
        </View>

        {/* Branding Info */}
        <View style={introStyles.branding}>
          <Text style={introStyles.brandText}>A U R O R A</Text>
          <Text style={introStyles.tagline}>Understand yourself{'\n'}better every day.</Text>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={introStyles.bottomSection}>
        {/* Gradient Button */}
        <TouchableOpacity
          onPress={setSeenIntro}
          style={introStyles.primaryBtn}
          accessibilityLabel="Get Started"
        >
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="56">
              <Rect width="100%" height="56" rx={28} fill="url(#btnGrad)" />
            </Svg>
          </View>
          <Text style={introStyles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        {/* Log In Link */}
        <TouchableOpacity onPress={setSeenIntro} style={introStyles.loginBtn} accessibilityLabel="Log in">
          <Text style={introStyles.loginBtnText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const introStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090D14',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.huge,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  logoWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoCenterText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: fontWeight.bold,
  },
  branding: {
    alignItems: 'center',
    gap: spacing.md,
  },
  brandText: {
    color: colors.ink,
    fontSize: type.title,
    fontWeight: fontWeight.extrabold,
    letterSpacing: 6,
  },
  tagline: {
    color: colors.inkSoft,
    fontSize: type.body + 2,
    lineHeight: 28,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...shadow,
  },
  primaryBtnText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.black,
  },
  loginBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  loginBtnText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
});
