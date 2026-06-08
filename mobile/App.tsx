import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

// WHY: The root component wraps the application with the global AuthProvider context
// and mounts the main AppNavigator stack conditional router. SafeAreaProvider exposes
// device safe-area insets (e.g. Android system nav bar) so screens can avoid overlap.
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
