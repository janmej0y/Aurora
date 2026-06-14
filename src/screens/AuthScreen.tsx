import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Mail, AlertCircle } from 'lucide-react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useHealth } from '../store/HealthContext';
import { colors, fontWeight, radius, shadow, shadowLg, spacing, type } from '../theme/tokens';

type AuthMode = 'signin' | 'signup';

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={colors.ink}>
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </Svg>
  );
}

export function AuthScreen() {
  const { authenticate, signIn, signUp, signInWithGoogle, authLoading } = useHealth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleContinue = async () => {
    clearMessages();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const err = mode === 'signin'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);

    if (err) {
      setError(err);
    } else if (mode === 'signup') {
      setSuccessMsg('Account created! Check your email to confirm, then sign in.');
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    const err = await signInWithGoogle();
    if (err) setError(err);
  };

  const switchMode = (next: AuthMode) => {
    clearMessages();
    setMode(next);
  };

  return (
    <SafeAreaView style={authStyles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={authStyles.flex}
      >
        <ScrollView
          contentContainerStyle={authStyles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding */}
          <View style={authStyles.brandSection}>
            {/* Glow rings + logo mark */}
            <View style={authStyles.logoGlowWrap}>
              <View style={authStyles.glowRing3} />
              <View style={authStyles.glowRing2} />
              <View style={authStyles.glowRing1} />
              <View style={authStyles.logoMark}>
                <Svg width={40} height={40} viewBox="0 0 40 40">
                  <Circle cx={20} cy={20} r={18} fill="none" stroke={colors.emerald} strokeWidth={2} strokeOpacity={0.3} />
                  <Circle cx={20} cy={20} r={12} fill="none" stroke={colors.emerald} strokeWidth={2.5} />
                  <Circle cx={20} cy={20} r={6} fill={colors.emerald} />
                </Svg>
              </View>
            </View>
            <Text style={authStyles.logoText}>AURORA</Text>
            <Text style={authStyles.tagline}>Your personal health companion</Text>
            <View style={authStyles.featurePills}>
              {['AI Coach', 'Sleep', 'Habits', 'Hydration'].map((f) => (
                <View key={f} style={authStyles.featurePill}>
                  <Text style={authStyles.featurePillText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Headline */}
          <View style={authStyles.header}>
            <Text style={authStyles.title}>
              {mode === 'signin' ? 'Welcome back' : 'Get started'}
            </Text>
            <Text style={authStyles.subtitle}>
              {mode === 'signin'
                ? 'Continue your health journey'
                : 'Create your free account in seconds'}
            </Text>
          </View>

          {/* Tab toggle */}
          <View style={authStyles.tabWrap}>
            {(['signin', 'signup'] as AuthMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => switchMode(m)}
                style={[authStyles.tab, mode === m && authStyles.tabActive]}
                accessibilityLabel={m === 'signin' ? 'Sign in' : 'Sign up'}
                disabled={authLoading}
              >
                <Text style={[authStyles.tabText, mode === m && authStyles.tabTextActive]}>
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={authStyles.form}>
            {/* Email */}
            <View style={authStyles.fieldWrap}>
              <Text style={authStyles.fieldLabel}>Email</Text>
              <View style={[authStyles.inputWrap, emailFocused && authStyles.inputWrapFocused]}>
                <Mail size={16} color={emailFocused ? colors.emerald : colors.muted} strokeWidth={2} />
                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearMessages(); }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.subtle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={authStyles.textInput}
                  editable={!authLoading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={authStyles.fieldWrap}>
              <Text style={authStyles.fieldLabel}>Password</Text>
              <View style={[authStyles.inputWrap, passwordFocused && authStyles.inputWrapFocused]}>
                <TextInput
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearMessages(); }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.subtle}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={[authStyles.textInput, { flex: 1 }]}
                  editable={!authLoading}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} accessibilityLabel="Toggle password visibility">
                  {showPassword ? (
                    <EyeOff size={16} color={colors.muted} strokeWidth={2} />
                  ) : (
                    <Eye size={16} color={colors.muted} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
              {mode === 'signin' && (
                <TouchableOpacity accessibilityLabel="Forgot password" disabled={authLoading}>
                  <Text style={authStyles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
              {mode === 'signup' && (
                <Text style={authStyles.hintText}>Minimum 6 characters</Text>
              )}
            </View>

            {/* Error / Success banner */}
            {error && (
              <View style={authStyles.errorBanner}>
                <AlertCircle size={14} color="#EF4444" strokeWidth={2} />
                <Text style={authStyles.errorText}>{error}</Text>
              </View>
            )}
            {successMsg && (
              <View style={authStyles.successBanner}>
                <Text style={authStyles.successText}>{successMsg}</Text>
              </View>
            )}

            {/* Primary CTA */}
            <TouchableOpacity
              onPress={handleContinue}
              style={[authStyles.primaryBtn, authLoading && authStyles.primaryBtnDisabled]}
              accessibilityLabel={mode === 'signin' ? 'Sign in' : 'Create account'}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={authStyles.primaryBtnText}>
                  {mode === 'signin' ? 'Continue' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={authStyles.dividerRow}>
              <View style={authStyles.dividerLine} />
              <Text style={authStyles.dividerText}>or continue with</Text>
              <View style={authStyles.dividerLine} />
            </View>

            {/* Google OAuth */}
            <TouchableOpacity
              onPress={handleGoogle}
              style={[authStyles.socialBtn, authLoading && authStyles.socialBtnDisabled]}
              accessibilityLabel="Continue with Google"
              disabled={authLoading}
            >
              <GoogleIcon />
              <Text style={authStyles.socialBtnText}>Google</Text>
            </TouchableOpacity>

            {/* Apple (UI only — needs Apple Developer account) */}
            <TouchableOpacity
              onPress={() => {}}
              style={[authStyles.socialBtn, authStyles.socialBtnDisabled]}
              accessibilityLabel="Continue with Apple"
              disabled
            >
              <AppleIcon />
              <Text style={[authStyles.socialBtnText, { color: colors.muted }]}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity
              onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              accessibilityLabel={mode === 'signin' ? 'Sign up' : 'Sign in'}
              disabled={authLoading}
            >
              <Text style={authStyles.footerLink}>
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Demo shortcut */}
          <TouchableOpacity
            onPress={() => authenticate('demo@aurora.health')}
            style={authStyles.demoBtn}
            accessibilityLabel="Use demo account"
            disabled={authLoading}
          >
            <Text style={authStyles.demoBtnText}>Use Demo Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const authStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  brandSection: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  logoGlowWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing3: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.emerald}08`,
  },
  glowRing2: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${colors.emerald}10`,
  },
  glowRing1: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.emerald}18`,
  },
  logoMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: fontWeight.black,
    letterSpacing: 6,
    marginTop: spacing.xs,
  },
  tagline: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
  },
  featurePills: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  featurePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: `${colors.emerald}18`,
    borderWidth: 1,
    borderColor: `${colors.emerald}30`,
  },
  featurePillText: {
    color: colors.emerald,
    fontSize: type.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontSize: type.display,
    fontWeight: fontWeight.black,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.muted,
    fontSize: type.body,
    lineHeight: 24,
  },
  tabWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  tabText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },
  tabTextActive: {
    color: colors.ink,
  },
  form: {
    gap: spacing.lg,
  },
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  inputWrapFocused: {
    borderColor: colors.emerald,
    backgroundColor: colors.surface2,
  },
  textInput: {
    flex: 1,
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.semibold,
  },
  forgotText: {
    color: colors.emerald,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  hintText: {
    color: colors.subtle,
    fontSize: type.micro ?? 11,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: type.small,
    fontWeight: fontWeight.semibold,
  },
  successBanner: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  successText: {
    color: colors.emerald,
    fontSize: type.small,
    fontWeight: fontWeight.semibold,
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...shadowLg,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: colors.background,
    fontSize: type.body,
    fontWeight: fontWeight.black,
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  socialBtnDisabled: {
    opacity: 0.5,
  },
  socialBtnText: {
    color: colors.ink,
    fontSize: type.body,
    fontWeight: fontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerText: {
    color: colors.muted,
    fontSize: type.small,
  },
  footerLink: {
    color: colors.emerald,
    fontSize: type.small,
    fontWeight: fontWeight.extrabold,
  },
  demoBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  demoBtnText: {
    color: colors.subtle,
    fontSize: type.small,
    fontWeight: fontWeight.bold,
  },
});
