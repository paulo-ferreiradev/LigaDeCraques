import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';
import Alert from '../utils/alert';

interface Player {
  id: string;
  name: string;
  playerType: string;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
}

const ManagePlayersScreen = ({ navigation }: any) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [name, setName] = useState('');

  // Edit Panel State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlayerType, setEditPlayerType] = useState('FIXED');
  const [editRole, setEditRole] = useState('USER');

  const fetchPlayers = useCallback(async () => {
    setIsLoadingPlayers(true);
    try {
      const response = await apiClient.get('/players');
      setPlayers(response.data);
    } catch (e) {
      console.log('Error fetching players:', e);
      Alert.alert('Error', 'Failed to load players list.');
    } finally {
      setIsLoadingPlayers(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleRegisterPlayer = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Player name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/players', { name: name.trim() });
      Alert.alert('Success', `Registered player '${name}' successfully!`);
      setName('');
      fetchPlayers();
    } catch (e: any) {
      console.log('Error creating player:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to register player.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (player: Player) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditPlayerType(player.playerType || 'FIXED');
    setEditRole(player.user?.role || 'USER');
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Player name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.patch(`/players/${editingPlayer.id}`, {
        name: editName.trim(),
        playerType: editPlayerType,
        role: editRole,
      });

      Alert.alert('Success', 'Player updated successfully!');
      setEditingPlayer(null);
      fetchPlayers();
    } catch (e: any) {
      console.log('Error updating player:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to update player.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlayerItem = ({ item }: { item: Player }) => {
    const hasAccount = !!item.user;
    const userRole = item.user?.role || 'NONE';

    return (
      <View style={styles.playerCard}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerNameText}>{item.name}</Text>
          <View style={styles.badgesRow}>
            {/* Player Type Badge */}
            <View
              style={[
                styles.badge,
                item.playerType === 'FIXED' ? styles.fixedBadge : styles.guestBadge,
              ]}
            >
              <Text style={styles.badgeText}>{item.playerType}</Text>
            </View>

            {/* System Access Role Badge */}
            {hasAccount && (
              <View
                style={[
                  styles.badge,
                  userRole === 'ADMIN'
                    ? styles.adminBadge
                    : userRole === 'TREASURER'
                    ? styles.treasurerBadge
                    : styles.userBadge,
                ]}
              >
                <Text style={styles.badgeText}>{userRole}</Text>
              </View>
            )}
          </View>
          {hasAccount && <Text style={styles.playerEmailText}>{item.user?.email}</Text>}
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => handleStartEdit(item)}>
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={renderPlayerItem}
          ListHeaderComponent={
            <>
              {/* Dynamic Edit vs Create Panel */}
              {editingPlayer ? (
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <Ionicons name="create" size={20} color="#EAB308" />
                    <Text style={[styles.formTitle, { color: '#EAB308', marginLeft: 6 }]}>
                      Edit Player Details
                    </Text>
                  </View>
                  <Text style={styles.formDesc}>
                    Modify displaying name, player classification, and system access role.
                  </Text>

                  {/* Name Input */}
                  <Text style={styles.label}>Display Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                  />

                  {/* Player Type Selection Pills */}
                  <Text style={styles.label}>Player Type</Text>
                  <View style={styles.pillRow}>
                    <TouchableOpacity
                      style={[styles.pillBtn, editPlayerType === 'FIXED' && styles.pillActiveFixed]}
                      onPress={() => setEditPlayerType('FIXED')}
                    >
                      <Text style={styles.pillText}>FIXED</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pillBtn, editPlayerType === 'GUEST' && styles.pillActiveGuest]}
                      onPress={() => setEditPlayerType('GUEST')}
                    >
                      <Text style={styles.pillText}>GUEST</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Access Role Selection Pills (Only if they have a registered user account) */}
                  {editingPlayer.user ? (
                    <>
                      <Text style={styles.label}>System Access Role</Text>
                      <View style={styles.pillRow}>
                        <TouchableOpacity
                          style={[styles.pillBtn, editRole === 'USER' && styles.pillActiveUser]}
                          onPress={() => setEditRole('USER')}
                        >
                          <Text style={styles.pillText}>USER</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pillBtn, editRole === 'TREASURER' && styles.pillActiveTreasurer]}
                          onPress={() => setEditRole('TREASURER')}
                        >
                          <Text style={styles.pillText}>TREASURER</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.pillBtn, editRole === 'ADMIN' && styles.pillActiveAdmin]}
                          onPress={() => setEditRole('ADMIN')}
                        >
                          <Text style={styles.pillText}>ADMIN</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.roleNoticeText}>
                      No user account linked to this profile. Access role can only be assigned once they sign up.
                    </Text>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setEditingPlayer(null)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleSaveEdit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Register New Player</Text>
                  <Text style={styles.formDesc}>
                    Add a new profile to the league. Players can later link this profile to their user accounts.
                  </Text>

                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Cristiano Ronaldo"
                    placeholderTextColor="#6B7280"
                    value={name}
                    onChangeText={setName}
                  />

                  <TouchableOpacity
                    style={styles.createBtn}
                    onPress={handleRegisterPlayer}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.createBtnText}>Register Player</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.sectionHeader}>Registered Players</Text>
            </>
          }
          ListEmptyComponent={
            isLoadingPlayers ? (
              <ActivityIndicator style={{ marginTop: 20 }} color="#10B981" />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No players registered yet.</Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pillBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  pillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pillActiveFixed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  pillActiveGuest: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  pillActiveUser: {
    backgroundColor: '#374151',
    borderColor: '#9CA3AF',
  },
  pillActiveTreasurer: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
  },
  pillActiveAdmin: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#EAB308',
  },
  roleNoticeText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 0.45,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13,
  },
  saveBtn: {
    flex: 0.45,
    backgroundColor: '#EAB308',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  createBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingLeft: 4,
  },
  playerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  badgesRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  fixedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  guestBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  adminBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  treasurerBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  userBadge: {
    backgroundColor: '#374151',
  },
  playerEmailText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: '#334155',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
});

export default ManagePlayersScreen;
