import { Animated } from 'react-native';
import { Circle } from 'react-native-svg';

// react-native-svg doesn't natively accept Animated values on SVG props.
// This creates an Animated-wrapped Circle so we can animate r, opacity, etc.
export const AnimatedCircle = Animated.createAnimatedComponent(Circle);
