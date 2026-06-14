import { Platform, type ViewStyle } from 'react-native';

/**
 * Aurora Design System — Theme Definitions
 * Charcoal (Deep Blue-Charcoal), Slate (Blue-Gray), OLED (Pure Black)
 */
export const themes = {
  Charcoal: {
    background: '#0D1117',       // deep charcoal background
    surface: '#151B23',          // elevated card surface
    surface2: '#1E2530',         // nested card / inner surface
    surface3: '#262F3D',         // deepest nested surface
    surfaceHover: '#2E394A',     // pressed state
    border: '#222B36',           // subtle border
    borderStrong: '#2E3A4B',     // emphasized border
    borderSubtle: '#181F2B',     // separator
    track: '#2A3545',            // progress track
  },
  Slate: {
    background: '#0F172A',       // slate-900 background
    surface: '#1E293B',          // slate-800 elevated card
    surface2: '#334155',         // slate-700 nested card
    surface3: '#475569',         // slate-600 deepest nested
    surfaceHover: '#3F4E64',     // pressed state
    border: '#334155',           // slate border
    borderStrong: '#475569',     // emphasized slate border
    borderSubtle: '#1E293B',     // separator
    track: '#334155',            // progress track
  },
  OLED: {
    background: '#000000',       // pure black background
    surface: '#0D0D0D',          // elevated dark card surface
    surface2: '#161616',         // nested surface
    surface3: '#222222',         // deepest surface
    surfaceHover: '#2A2A2A',     // pressed state
    border: '#262626',           // border
    borderStrong: '#333333',     // strong border
    borderSubtle: '#121212',     // separator
    track: '#262626',            // progress track
  },
};

// Start with Charcoal as default active colors
export const colors = {
  // Static Accents (consistent across all themes)
  emerald: '#22C55E',          // success green
  emeraldDark: '#16A34A',      // pressed green
  emeraldSoft: '#22C55E18',    // tinted background
  emeraldGlow: '#22C55E33',    // glow rings
  mint: '#22C55E22',           // very soft tint
  
  blue: '#3B82F6',             // info blue
  blueSoft: '#3B82F618',
  blueGlow: '#3B82F633',
  
  amber: '#F59E0B',            // warning amber / insights
  amberSoft: '#F59E0B18',
  amberGlow: '#F59E0B33',
  
  coral: '#EF4444',            // alert red
  coralSoft: '#EF444418',
  
  lilac: '#8B7BFF',            // sleep purple
  lilacSoft: '#8B7BFF18',
  lilacGlow: '#8B7BFF33',
  
  success: '#22C55E',
  danger: '#EF4444',
  dangerSoft: '#EF444418',
  warning: '#F59E0B',
  
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmer: '#1F2937',

  // Core Text (remains high-contrast white/gray in all themes)
  ink: '#FFFFFF',              // white typography
  inkSoft: '#8B98A5',          // secondary text
  muted: '#616E7C',            // tertiary / captions
  subtle: '#3E4C5A',           // disabled

  // Dynamic Theme Colors (mutated in-place, default is Charcoal)
  background: '#0D1117',
  surface: '#151B23',
  surface2: '#1E2530',
  surface3: '#262F3D',
  surfaceHover: '#2E394A',
  border: '#222B36',
  borderStrong: '#2E3A4B',
  borderSubtle: '#181F2B',
  track: '#2A3545',
};

// In-place mutation helper to update static color references
export function applyTheme(themeName: 'Charcoal' | 'Slate' | 'OLED') {
  const chosen = themes[themeName] || themes.Charcoal;
  Object.assign(colors, chosen);
}

/**
 * Returns the live color palette for the current theme.
 * Call this inside a component that reads `state.theme` from useHealth()
 * to get an object you can spread into inline styles — these evaluate at
 * render-time and therefore pick up any in-place mutation correctly.
 */
export function getThemeColors(themeName?: 'Charcoal' | 'Slate' | 'OLED') {
  const chosen = themes[themeName ?? 'Charcoal'] ?? themes.Charcoal;
  return { ...colors, ...chosen };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const type = {
  hero: 36,
  display: 30,
  title: 26,
  section: 20,
  body: 16,
  small: 13,
  micro: 11,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const shadow: ViewStyle =
  Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    } as ViewStyle,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
    },
  }) ?? {};

export const shadowLg: ViewStyle =
  Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
    } as ViewStyle,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 40,
      elevation: 12,
    },
  }) ?? {};

export const shadowGreen: ViewStyle =
  Platform.select<ViewStyle>({
    web: {
      boxShadow: '0 0 24px rgba(34, 197, 94, 0.15)',
    } as ViewStyle,
    default: {
      shadowColor: '#22C55E',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 4,
    },
  }) ?? {};
