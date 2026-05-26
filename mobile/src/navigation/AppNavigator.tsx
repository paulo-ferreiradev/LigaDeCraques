import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // WHY: Built-in in Expo, zero configuration needed.
import { useAuth } from '../context/AuthContext';

// Import Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MatchesScreen from '../screens/MatchesScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import Admin Screens
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import ManagePlayersScreen from '../screens/ManagePlayersScreen';
import ManageSeasonsScreen from '../screens/ManageSeasonsScreen';
import ManageMatchesScreen from '../screens/ManageMatchesScreen';
import ManagePaymentsScreen from '../screens/ManagePaymentsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AdminStack = createStackNavigator();

// WHY: AdminNavigator groups all administrative options.
const AdminNavigator = () => (
  <AdminStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: { fontWeight: 'bold', fontSize: 16 },
    }}
  >
    <AdminStack.Screen 
      name="AdminDashboard" 
      component={AdminDashboardScreen} 
      options={{ title: 'Admin Control Hub' }} 
    />
    <AdminStack.Screen 
      name="ManagePlayers" 
      component={ManagePlayersScreen} 
      options={{ title: 'Register Player' }} 
    />
    <AdminStack.Screen 
      name="ManageSeasons" 
      component={ManageSeasonsScreen} 
      options={{ title: 'Manage Seasons' }} 
    />
    <AdminStack.Screen 
      name="ManageMatches" 
      component={ManageMatchesScreen} 
      options={{ title: 'Manage Matches' }} 
    />
    <AdminStack.Screen 
      name="ManagePayments" 
      component={ManagePaymentsScreen} 
      options={{ title: 'Issue Invoice' }} 
    />
  </AdminStack.Navigator>
);

// WHY: AuthNavigator wraps public screens. When not authenticated, users can only access these.
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// WHY: MainTabNavigator houses protected screens with a sleek dark aesthetic.
const MainTabNavigator = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any;

          if (route.name === 'Dashboard') {
            iconName = 'trophy-outline';
          } else if (route.name === 'Matches') {
            iconName = 'football-outline';
          } else if (route.name === 'Payments') {
            iconName = 'cash-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          } else if (route.name === 'Admin') {
            iconName = 'shield-half-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10B981', // Sleek Emerald Green for active tab
        tabBarInactiveTintColor: '#9CA3AF', // Charcoal Grey for inactive
        tabBarStyle: {
          backgroundColor: '#111827', // Pitch dark background
          borderTopColor: '#374151',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#111827',
          borderBottomColor: '#1F2937',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Standings' }} 
      />
      <Tab.Screen 
        name="Matches" 
        component={MatchesScreen} 
        options={{ title: 'Matches' }} 
      />
      <Tab.Screen 
        name="Payments" 
        component={PaymentsScreen} 
        options={{ title: 'Financials' }} 
      />

      {/* WHY: Dynamically injects the Admin tab only if the logged-in user is an ADMIN */}
      {user?.role === 'ADMIN' && (
        <Tab.Screen 
          name="Admin" 
          component={AdminNavigator} 
          options={{ title: 'Admin', headerShown: false }} 
        />
      )}

      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  // WHY: Displays a clean custom loader while session tokens are verified on app launch.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;
