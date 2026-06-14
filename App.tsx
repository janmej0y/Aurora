import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { HealthProvider } from './src/store/HealthContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <HealthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </HealthProvider>
    </SafeAreaProvider>
  );
}
