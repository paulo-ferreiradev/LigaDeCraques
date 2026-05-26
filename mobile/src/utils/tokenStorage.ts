import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// WHY: High-performance Hybrid Storage Adapter. 
// Web browsers lack native hardware Keychains, causing 'expo-secure-store' to throw TypeError crashes.
// This adapter seamlessly uses React Native's AsyncStorage (local storage polyfill) on the Web, 
// and maintains hardware-level encrypted secure storage (SecureStore) on iOS and Android devices.
export const tokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};
