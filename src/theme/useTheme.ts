import { useHealth } from '../store/HealthContext';
import { getThemeColors } from './tokens';

/**
 * Returns a live color palette that always matches the current theme selection.
 * Use the returned `tc` object for inline styles on containers (background,
 * surface, border, track) so they update when the user switches themes.
 *
 * Static accent colors (emerald, blue, amber, etc.) remain the same across
 * all themes — use them directly from `colors` in tokens.
 */
export function useTheme() {
  const { state } = useHealth();
  return getThemeColors(state.theme);
}
