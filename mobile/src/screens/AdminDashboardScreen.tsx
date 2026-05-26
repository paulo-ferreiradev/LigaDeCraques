import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AdminDashboardScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoArea}>
          <Ionicons name="shield-checkmark" size={32} color="#EAB308" />
          <Text style={styles.infoTitle}>Control Panel</Text>
          <Text style={styles.infoSubtitle}>Manage league operations, players, and match records.</Text>
        </View>

        <View style={styles.grid}>
          {/* Manage Players */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ManagePlayers')}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="people" size={24} color="#10B981" />
            </View>
            <Text style={styles.cardTitle}>Add Players</Text>
            <Text style={styles.cardDesc}>Register new player profiles in the database.</Text>
          </TouchableOpacity>

          {/* Manage Seasons */}
          <TouchableOpacity
            style={[styles.card, styles.topMargin]}
            onPress={() => navigation.navigate('ManageSeasons')}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="calendar" size={24} color="#EF4444" />
            </View>
            <Text style={styles.cardTitle}>Manage Seasons</Text>
            <Text style={styles.cardDesc}>Create new seasons and toggle active status.</Text>
          </TouchableOpacity>

          {/* Manage Matches */}
          <TouchableOpacity
            style={[styles.card, styles.topMargin]}
            onPress={() => navigation.navigate('ManageMatches')}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="football" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.cardTitle}>Manage Matches</Text>
            <Text style={styles.cardDesc}>Schedule games, assign rosters, and record scores.</Text>
          </TouchableOpacity>

          {/* Treasury Billing */}
          <TouchableOpacity
            style={[styles.card, styles.topMargin]}
            onPress={() => navigation.navigate('ManagePayments')}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Ionicons name="wallet" size={24} color="#EAB308" />
            </View>
            <Text style={styles.cardTitle}>Treasury Billing</Text>
            <Text style={styles.cardDesc}>Issue manual bills and monthly player subscriptions.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoArea: {
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  infoSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  grid: {
    flex: 1,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'column',
  },
  topMargin: {
    marginTop: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
});

export default AdminDashboardScreen;
