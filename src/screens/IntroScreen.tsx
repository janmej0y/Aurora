import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { Droplets, BedDouble, Sparkles, TrendingUp, Brain } from 'lucide-react-native';

import { useHealth } from '../store/HealthContext';
import { colors, fontWeight, radius, spacing, type } from '../theme/tokens';

const { width: W, height: H } = Dimensions.get('window');

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: typeof Droplets;
};

const SLIDES: Slide[] = [
  {
    id: 'hero',
    eyebrow: 'AURORA',
    title: 'Understand yourself\nbetter every day.',
    subtitle: 'Your personal AI health companion. Built around your life.',
    accent: '#10B981',
    icon: Sparkles,
  },
  {
    id: 'companion',
    eyebrow: 'MEET AURORA',
    title: 'Your personal\nhealth companion.',
    subtitle: 'Aurora learns your patterns and coaches you with warmth, not pressure.',
    accent: '#06B6D4',
    icon: Brain,
  },
  {
    id: 'track',
    eyebrow: 'EFFORTLESS TRACKING',
    title: 'Track hydration,\nsleep, habits,\nand nutrition.',
    subtitle: 'Just speak naturally. Aurora logs it for you in seconds.',
    accent: '#8B5CF6',
    icon: Droplets,
  },
  {
    id: 'insights',
    eyebrow: 'DAILY INSIGHTS',
    title: 'Receive personalized\ndaily insights.',
    subtitle: "Spot trends you'd never notice. Aurora connects the dots across all your data.",
    accent: '#F59E0B',
    icon: TrendingUp,
  },
  {
    id: 'habits',
    eyebrow: 'BUILD CONSISTENCY',
    title: 'Build healthier\nroutines through\nconsistency.',
    subtitle: 'Small wins compound. Aurora celebrates every step and keeps you on track.',
    accent: '#EC4899',
    icon: BedDouble,
  },
];

function SlideBackground({ accent }: { accent: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#06080F" />
            <Stop offset="55%" stopColor="#0C1220" />
            <Stop offset="100%" stopColor="#060810" />
          </LinearGradient>
          <LinearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={accent} stopOpacity="0.0" />
            <Stop offset="50%" stopColor={accent} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={accent} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#sky)" />
        {/* Ambient glow from top-right */}
        <Circle cx={W * 0.8} cy={H * 0.15} r={W * 0.65} fill={accent} opacity={0.06} />
        {/* Mountain silhouettes */}
        <Path
          d={`M0 ${H * 0.82} L${W * 0.22} ${H * 0.68} L${W * 0.5} ${H * 0.76} L${W * 0.78} ${H * 0.64} L${W} ${H * 0.74} L${W} ${H} L0 ${H} Z`}
          fill="#05080E"
        />
        <Path
          d={`M0 ${H * 0.87} L${W * 0.32} ${H * 0.76} L${W * 0.65} ${H * 0.81} L${W} ${H * 0.73} L${W} ${H} L0 ${H} Z`}
          fill="#030508"
          opacity={0.9}
        />
      </Svg>
    </View>
  );
}

function SlideOrb({ accent, icon: Icon }: { accent: string; icon: typeof Droplets }) {
  return (
    <View style={orbStyles.wrap}>
      {/* Outer glow rings */}
      <View style={[orbStyles.ring3, { borderColor: `${accent}18` }]} />
      <View style={[orbStyles.ring2, { borderColor: `${accent}28` }]} />
      <View style={[orbStyles.ring1, { borderColor: `${accent}40` }]} />
      {/* Core circle */}
      <View style={[orbStyles.core, { backgroundColor: `${accent}18`, borderColor: `${accent}60` }]}>
        <Icon size={32} color={accent} strokeWidth={1.8} />
      </View>
    </View>
  );
}

const orbStyles = StyleSheet.create({
  wrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
  },
  ring2: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1,
  },
  ring1: {
    position: 'absolute',
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 1.5,
  },
  core: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[slideStyles.slide, { width: W }]}>
      <SlideBackground accent={item.accent} />

      <View style={slideStyles.content}>
        <SlideOrb accent={item.accent} icon={item.icon} />

        <View style={slideStyles.text}>
          <Text style={[slideStyles.eyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
          <Text style={slideStyles.title}>{item.title}</Text>
          <Text style={slideStyles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    paddingBottom: H * 0.18,
  },
  text: {
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: type.micro ?? 11,
    fontWeight: fontWeight.black,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F1F5F9',
    fontSize: type.display + 4,
    fontWeight: fontWeight.black,
    lineHeight: 42,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: type.body,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
    maxWidth: 300,
  },
});

function Dots({ count, active, accent }: { count: number; active: number; accent: string }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === active
              ? { width: 20, backgroundColor: accent }
              : { width: 6, backgroundColor: '#2A3347' },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});

export function IntroScreen() {
  const { setSeenIntro } = useHealth();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const isLast = activeIndex === SLIDES.length - 1;
  const activeSlide = SLIDES[activeIndex];

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const goNext = () => {
    if (isLast) {
      setSeenIntro();
    } else {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const skip = () => setSeenIntro();

  return (
    <SafeAreaView style={introStyles.screen}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <SlideItem item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {/* Bottom controls */}
      <View style={introStyles.bottom}>
        <Dots count={SLIDES.length} active={activeIndex} accent={activeSlide.accent} />

        <TouchableOpacity
          onPress={goNext}
          style={[introStyles.primaryBtn, { backgroundColor: activeSlide.accent }]}
          accessibilityLabel={isLast ? 'Get Started' : 'Next'}
        >
          <Text style={introStyles.primaryBtnText}>
            {isLast ? 'Get Started →' : 'Next →'}
          </Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={skip} style={introStyles.skipBtn} accessibilityLabel="Skip">
            <Text style={introStyles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const introStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#06080F',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: 'transparent',
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#060810',
    fontSize: type.body,
    fontWeight: fontWeight.black,
    letterSpacing: 0.3,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  skipText: {
    color: '#475569',
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
});
