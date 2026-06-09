import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';
import Alert from '../utils/alert';

interface Season {
  id: string;
  year: number;
  seasonType: string;
  status: string;
}

interface Player {
  id: string;
  name: string;
}

const ManageSeasonsScreen = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState('');
  const [seasonType, setSeasonType] = useState<'SUMMER' | 'WINTER'>('SUMMER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WHY: Hall of Fame award granting — used to register historical champions that predate the app.
  const [players, setPlayers] = useState<Player[]>([]);
  const [awardPlayerId, setAwardPlayerId] = useState<string | null>(null);
  const [awardYear, setAwardYear] = useState('');
  const [awardTitle, setAwardTitle] = useState('');
  const [awardSeasonId, setAwardSeasonId] = useState<string | null>(null);
  const [isGrantingAward, setIsGrantingAward] = useState(false);

  const fetchSeasons = useCallback(async () => {
    try {
      const response = await apiClient.get('/seasons');
      setSeasons(response.data.data);
    } catch (e) {
      console.log('Error fetching seasons:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await apiClient.get('/players');
      setPlayers(response.data);
    } catch (e) {
      console.log('Error fetching players:', e);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
    fetchPlayers();
  }, [fetchSeasons, fetchPlayers]);

  const handleGrantAward = async () => {
    if (!awardPlayerId) {
      Alert.alert('Validation Error', 'Please select the player who won the title.');
      return;
    }
    const parsedYear = parseInt(awardYear, 10);
    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      Alert.alert('Validation Error', 'Please enter a valid year (e.g. 2024).');
      return;
    }

    setIsGrantingAward(true);
    try {
      // WHY: type is CHAMPION (the Hall of Fame source). seasonId/title are optional — omit them
      // entirely for pre-app legacy honors so the backend stores a standalone, year-only award.
      await apiClient.post('/seasons/awards', {
        playerId: awardPlayerId,
        year: parsedYear,
        type: 'CHAMPION',
        ...(awardTitle.trim() && { title: awardTitle.trim() }),
        ...(awardSeasonId && { seasonId: awardSeasonId }),
      });
      Alert.alert('Success', 'Champion added to the Hall of Fame!');
      setAwardPlayerId(null);
      setAwardYear('');
      setAwardTitle('');
      setAwardSeasonId(null);
    } catch (e: any) {
      console.log('Error granting award:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to grant award.');
    } finally {
      setIsGrantingAward(false);
    }
  };

  const handleCreateSeason = async () => {
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      Alert.alert('Validation Error', 'Please enter a valid year (e.g. 2026).');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/seasons', {
        year: parsedYear,
        seasonType,
        status: 'ACTIVE',
      });
      Alert.alert('Success', 'Created new active season successfully!');
      setYear('');
      fetchSeasons();
    } catch (e: any) {
      console.log('Error creating season:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to create season.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'FINISHED' : 'ACTIVE';
    Alert.alert(
      'Change Season Status',
      `Are you sure you want to set this season status to ${nextStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.patch(`/seasons/${id}`, { status: nextStatus });
              setSeasons((prev) =>
                prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s)),
              );
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to update status.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteSeason = async (id: string, year: number, seasonType: string) => {
    // WHY: Before permanently deleting any season data, we prompt the admin for explicit confirmation to prevent data loss.
    Alert.alert(
      'Delete Season',
      `Are you sure you want to permanently delete the season "${year} ${seasonType}"?\n\nThis will permanently delete all associated matches, RSVP lists, and MVP records. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/seasons/${id}`);
              // WHY: We filter the state locally after a successful backend delete call to reactively update the UI.
              setSeasons((prev) => prev.filter((s) => s.id !== id));
              Alert.alert('Success', 'Season deleted successfully!');
            } catch (e: any) {
              console.log('Error deleting season:', e);
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete season.');
            }
          },
        },
      ],
    );
  };

  const renderSeasonItem = ({ item }: { item: Season }) => {
    const isActive = item.status === 'ACTIVE';

    return (
      <View style={styles.seasonCard}>
        <View style={styles.seasonInfo}>
          <Text style={styles.seasonYear}>
            {item.year} {item.seasonType}
          </Text>
          <View style={[styles.statusPill, isActive ? styles.pillActive : styles.pillFinished]}>
            <Text style={styles.pillText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.statusBtn, isActive ? styles.finishBtn : styles.activeBtn]}
            onPress={() => handleToggleStatus(item.id, item.status)}
          >
            <Ionicons
              name={isActive ? 'lock-closed-outline' : 'lock-open-outline'}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.statusBtnText}>{isActive ? 'Finish' : 'Activate'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteSeason(item.id, item.year, item.seasonType)}
          >
            <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ListHeader = (
    <>
      {/* Create Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create New Season</Text>
        <View style={styles.formRow}>
          <TextInput
            style={styles.yearInput}
            placeholder="Year (e.g. 2026)"
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            onChangeText={setYear}
          />
          
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.typeToggle, seasonType === 'SUMMER' && styles.typeToggleActive]}
              onPress={() => setSeasonType('SUMMER')}
            >
              <Text style={styles.typeToggleText}>SUMMER</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeToggle, seasonType === 'WINTER' && styles.typeToggleActive]}
              onPress={() => setSeasonType('WINTER')}
            >
              <Text style={styles.typeToggleText}>WINTER</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleCreateSeason}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createBtnText}>Start New Season</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Hall of Fame Award Card */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Add Hall of Fame Champion</Text>
        <Text style={styles.formHint}>
          Register a historical champion (even from years with no season recorded in the app).
        </Text>

        <Text style={styles.fieldLabel}>Champion</Text>
        <View style={styles.chipWrap}>
          {players.map((p) => {
            const selected = awardPlayerId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setAwardPlayerId(selected ? null : p.id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
          {players.length === 0 && (
            <Text style={styles.formHint}>No players found. Create players first.</Text>
          )}
        </View>

        <Text style={styles.fieldLabel}>Year</Text>
        <TextInput
          style={styles.fullInput}
          placeholder="e.g. 2024"
          placeholderTextColor="#6B7280"
          keyboardType="number-pad"
          maxLength={4}
          value={awardYear}
          onChangeText={setAwardYear}
        />

        <Text style={styles.fieldLabel}>Title (optional)</Text>
        <TextInput
          style={styles.fullInput}
          placeholder="e.g. Champion 2024 Winter"
          placeholderTextColor="#6B7280"
          value={awardTitle}
          onChangeText={setAwardTitle}
        />

        <Text style={styles.fieldLabel}>Link to a recorded season (optional)</Text>
        <View style={styles.chipWrap}>
          {seasons.map((s) => {
            const selected = awardSeasonId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setAwardSeasonId(selected ? null : s.id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {s.year} {s.seasonType}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.createBtn, styles.awardBtn]}
          onPress={handleGrantAward}
          disabled={isGrantingAward}
        >
          {isGrantingAward ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createBtnText}>Add to Hall of Fame</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Existing Seasons</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={seasons}
        keyExtractor={(item) => item.id}
        renderItem={renderSeasonItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No seasons configured yet.</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  yearInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    width: '40%',
  },
  toggleRow: {
    flexDirection: 'row',
    width: '56%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeToggle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  typeToggleActive: {
    backgroundColor: '#10B981',
  },
  typeToggleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
  awardBtn: {
    backgroundColor: '#EAB308',
    marginTop: 8,
  },
  formHint: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 4,
  },
  fullInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#EAB308',
    fontWeight: 'bold',
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
    paddingLeft: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  seasonCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  seasonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonYear: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusPill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  pillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  pillFinished: {
    backgroundColor: '#374151',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  finishBtn: {
    backgroundColor: '#EF4444',
  },
  activeBtn: {
    backgroundColor: '#10B981',
  },
  statusBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    // WHY: Provides a distinct, premium-looking red round button with padding matching the lock status button.
    backgroundColor: '#EF4444',
    padding: 6,
    borderRadius: 6,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
});

export default ManageSeasonsScreen;
