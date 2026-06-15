// In production builds, fall back to the hardcoded Render URL so voice/chat
// never silently fail if the EAS env var is missing from the bundle.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? 'http://localhost:4000' : 'https://aurora-api-lo5b.onrender.com');

if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[Aurora] EXPO_PUBLIC_API_URL not set — using localhost:4000 for dev.');
}
