export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
  console.warn('[Aurora] EXPO_PUBLIC_API_URL not set — using localhost:4000. Set it to your Render URL for production.');
}
