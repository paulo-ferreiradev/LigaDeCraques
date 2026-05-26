import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/apiClient';

interface Player {
  id: string;
  name: string;
  playerType: string;
}

interface Match {
  id: string;
  playedAt: string;
  status: string;
  teamAScore?: number | null;
  teamBScore?: number | null;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  season: {
    year: number;
    seasonType: string;
  };
}

interface Season {
  id: string;
  year: number;
  seasonType: string;
}

const ManageMatchesScreen = () => {
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<Match[]>([]);
  const [votingMatches, setVotingMatches] = useState<Match[]>([]);
  const [rsvps, setRsvps] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isLoadingRsvps, setIsLoadingRsvps] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Selections
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<string[]>([]);
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<string[]>([]);

  // Scores
  const [teamAScore, setTeamAScore] = useState('');
  const [teamBScore, setTeamBScore] = useState('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Fetch active season
      const seasonResponse = await apiClient.get('/seasons/active');
      setActiveSeason(seasonResponse.data);

      // 2. Fetch players list
      const playersResponse = await apiClient.get('/players');
      setPlayers(playersResponse.data);

      // 3. Fetch scheduled & voting matches
      const matchesResponse = await apiClient.get('/matches', { params: { limit: 20 } });
      const sched = matchesResponse.data.data.filter((m: Match) => m.status === 'SCHEDULED');
      const voting = matchesResponse.data.data.filter((m: Match) => m.status === 'VOTING');
      setScheduledMatches(sched);
      setVotingMatches(voting);
    } catch (e: any) {
      console.log('Error loading management data:', e);
      if (e.response?.status === 404) {
        Alert.alert('Configuration Required', 'Please create and activate a Season first.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // WHY: Automatically refresh active match and season lists whenever the screen gains navigation focus.
      loadData();
    }, [loadData])
  );

  const handleScheduleMatch = async () => {
    if (!activeSeason) {
      Alert.alert('Error', 'No active season running.');
      return;
    }

    setIsScheduling(true);
    try {
      await apiClient.post('/matches', {
        seasonId: activeSeason.id,
      });
      Alert.alert('Success', 'Scheduled new match in the active season!');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to schedule match.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSelectMatch = async (match: Match) => {
    setSelectedMatch(match);
    setTeamAPlayerIds(match.teamAPlayers.map((p) => p.id));
    setTeamBPlayerIds(match.teamBPlayers.map((p) => p.id));
    setTeamAScore('');
    setTeamBScore('');

    // WHY: Fetch match RSVP convocatória results to dynamically group fixed players
    // for seamless, on-the-spot team rosters entry.
    if (match.status === 'SCHEDULED') {
      setIsLoadingRsvps(true);
      try {
        const response = await apiClient.get(`/matches/${match.id}/rsvps`);
        setRsvps(response.data);
      } catch (err) {
        console.log('Error fetching match RSVPs:', err);
      } finally {
        setIsLoadingRsvps(false);
      }
    } else {
      setRsvps([]);
    }
  };

  const togglePlayerTeam = (playerId: string, team: 'A' | 'B') => {
    if (team === 'A') {
      if (teamAPlayerIds.includes(playerId)) {
        setTeamAPlayerIds((prev) => prev.filter((id) => id !== playerId));
      } else {
        setTeamBPlayerIds((prev) => prev.filter((id) => id !== playerId));
        setTeamAPlayerIds((prev) => [...prev, playerId]);
      }
    } else {
      if (teamBPlayerIds.includes(playerId)) {
        setTeamBPlayerIds((prev) => prev.filter((id) => id !== playerId));
      } else {
        setTeamAPlayerIds((prev) => prev.filter((id) => id !== playerId));
        setTeamBPlayerIds((prev) => [...prev, playerId]);
      }
    }
  };

  const handleRecordResult = async () => {
    if (!selectedMatch) return;
    const scoreA = parseInt(teamAScore, 10);
    const scoreB = parseInt(teamBScore, 10);

    if (isNaN(scoreA) || isNaN(scoreB) || scoreA < 0 || scoreB < 0) {
      Alert.alert('Validation Error', 'Please enter valid scores for both teams.');
      return;
    }

    if (teamAPlayerIds.length === 0 || teamBPlayerIds.length === 0) {
      Alert.alert('Validation Error', 'Please assign at least one player to Team A and Team B rosters.');
      return;
    }

    setIsRecording(true);
    try {
      // WHY: Save match score and final participating rosters simultaneously.
      // Automatically triggers guest player per-match bill invoicing transaction on the backend.
      await apiClient.patch(`/matches/${selectedMatch.id}/result`, {
        teamAScore: scoreA,
        teamBScore: scoreB,
        teamAPlayerIds,
        teamBPlayerIds,
      });

      Alert.alert('Success', 'Match score and teams registered! MVP voting has been opened.');
      setSelectedMatch(null);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to record result.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleForceFinalize = async () => {
    if (!selectedMatch) return;

    setIsFinalizing(true);
    try {
      await apiClient.post(`/matches/${selectedMatch.id}/votes/finalize`);
      Alert.alert('Success', 'Voting closed early. Match MVP has been calculated and match completed!');
      setSelectedMatch(null);
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to finalize voting.');
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Group players for scheduled match roster builder
  const confirmed = players.filter((p) => {
    const r = rsvps.find((x) => x.playerId === p.id);
    return p.playerType === 'FIXED' && r?.status === 'CONFIRMED';
  });

  const declined = players.filter((p) => {
    const r = rsvps.find((x) => x.playerId === p.id);
    return p.playerType === 'FIXED' && r?.status === 'DECLINED';
  });

  const pending = players.filter((p) => {
    const r = rsvps.find((x) => x.playerId === p.id);
    return p.playerType === 'FIXED' && (!r || r.status === 'PENDING');
  });

  const guests = players.filter((p) => p.playerType === 'GUEST');

  const renderPlayerRosterRow = (item: Player) => {
    const inA = teamAPlayerIds.includes(item.id);
    const inB = teamBPlayerIds.includes(item.id);

    return (
      <View key={item.id} style={styles.playerRosterRow}>
        <Text style={styles.playerName}>{item.name}</Text>
        <View style={styles.rosterBtns}>
          <TouchableOpacity
            style={[styles.teamBtn, inA && styles.teamBtnActiveA]}
            onPress={() => togglePlayerTeam(item.id, 'A')}
          >
            <Text style={styles.teamBtnText}>A</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teamBtn, inB && styles.teamBtnActiveB]}
            onPress={() => togglePlayerTeam(item.id, 'B')}
          >
            <Text style={styles.teamBtnText}>B</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* 1. Schedule Match Card */}
      {activeSeason && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule Next Match</Text>
          <Text style={styles.cardDesc}>
            Will schedule a match under the currently active season: {activeSeason.year}{' '}
            {activeSeason.seasonType}. Kickoff defaults to 22:30 and RSVP closes at 20:00 on the selected Tuesday.
          </Text>
          <TouchableOpacity
            style={styles.btnGreen}
            onPress={handleScheduleMatch}
            disabled={isScheduling}
          >
            {isScheduling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Schedule Now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 2. Select Match to Manage */}
      {(scheduledMatches.length > 0 || votingMatches.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Match to Manage</Text>
          
          {scheduledMatches.length > 0 && (
            <>
              <Text style={styles.subHeader}>SCHEDULED MATCHES</Text>
              <View style={styles.matchesList}>
                {scheduledMatches.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.matchSelectItem,
                      selectedMatch?.id === item.id && styles.matchSelectItemActive,
                    ]}
                    onPress={() => handleSelectMatch(item)}
                  >
                    <Ionicons name="football" size={16} color="#3B82F6" />
                    <Text style={styles.matchSelectText}>
                      Match in {item.season.year} {item.season.seasonType} ({item.teamAPlayers.length} vs{' '}
                      {item.teamBPlayers.length} players)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {votingMatches.length > 0 && (
            <>
              <Text style={[styles.subHeader, { marginTop: 16 }]}>ACTIVE MVP VOTINGS</Text>
              <View style={styles.matchesList}>
                {votingMatches.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.matchSelectItem,
                      selectedMatch?.id === item.id && styles.matchSelectItemActive,
                      { borderColor: 'rgba(16, 185, 129, 0.4)' }
                    ]}
                    onPress={() => handleSelectMatch(item)}
                  >
                    <Ionicons name="sparkles" size={16} color="#EAB308" />
                    <Text style={styles.matchSelectText}>
                      Match in {item.season.year} {item.season.seasonType} (Score: {item.teamAScore} - {item.teamBScore})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {/* 3. Manage Roster & Score (Conditional on Selection) */}
      {selectedMatch && selectedMatch.status === 'SCHEDULED' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Roster & Score Manager</Text>
          <Text style={styles.cardDesc}>
            Manage players and record results for the selected match.
          </Text>

          {/* Roster Assignment Grid Grouped by RSVP */}
          <Text style={styles.sectionTitle}>Assign Team Rosters</Text>
          
          {isLoadingRsvps ? (
            <ActivityIndicator style={{ padding: 20 }} color="#10B981" />
          ) : (
            <View style={styles.rosterGrid}>
              {/* Confirmed Attendees */}
              {confirmed.length > 0 && (
                <>
                  <Text style={styles.groupHeader}>CONFIRMED ATTENDEES ({confirmed.length})</Text>
                  {confirmed.map(renderPlayerRosterRow)}
                </>
              )}

              {/* Declined/Absent */}
              {declined.length > 0 && (
                <>
                  <Text style={[styles.groupHeader, { color: '#EF4444', marginTop: 12 }]}>DECLINED/ABSENT ({declined.length})</Text>
                  {declined.map(renderPlayerRosterRow)}
                </>
              )}

              {/* Pending Responses */}
              {pending.length > 0 && (
                <>
                  <Text style={[styles.groupHeader, { color: '#EAB308', marginTop: 12 }]}>PENDING RESPONSES ({pending.length})</Text>
                  {pending.map(renderPlayerRosterRow)}
                </>
              )}

              {/* Guests players */}
              {guests.length > 0 && (
                <>
                  <Text style={[styles.groupHeader, { color: '#3B82F6', marginTop: 12 }]}>GUEST PLAYERS ({guests.length})</Text>
                  {guests.map(renderPlayerRosterRow)}
                </>
              )}
            </View>
          )}

          {/* Enter Scores */}
          <Text style={styles.sectionTitle}>Record Final Scores</Text>
          <View style={styles.scoresRow}>
            <View style={styles.scoreInputGroup}>
              <Text style={styles.scoreInputLabel}>Team A Score</Text>
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#6B7280"
                value={teamAScore}
                onChangeText={setTeamAScore}
              />
            </View>
            <View style={styles.scoreInputGroup}>
              <Text style={styles.scoreInputLabel}>Team B Score</Text>
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#6B7280"
                value={teamBScore}
                onChangeText={setTeamBScore}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnYellow, styles.topSpacing]}
            onPress={handleRecordResult}
            disabled={isRecording}
          >
            {isRecording ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnTextBlack}>Record Score & Open MVP Votes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {selectedMatch && selectedMatch.status === 'VOTING' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>MVP Voting Status</Text>
          <Text style={styles.cardDesc}>
            This match has scores saved. Players who participated in this match are voting for the MVP.
          </Text>

          <View style={styles.scoresDisplayCard}>
            <Text style={styles.scoresDisplayTitle}>RECORDED SCORE</Text>
            <Text style={styles.scoresDisplayText}>
              Team A  <Text style={styles.glowingText}>{selectedMatch.teamAScore}</Text>  -  <Text style={styles.glowingText}>{selectedMatch.teamBScore}</Text>  Team B
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btnYellow, styles.topSpacing]}
            onPress={handleForceFinalize}
            disabled={isFinalizing}
          >
            {isFinalizing ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <Text style={styles.btnTextBlack}>Force Close & Elect MVP</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
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
    lineHeight: 18,
    marginBottom: 16,
  },
  btnGreen: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnYellow: {
    backgroundColor: '#EAB308',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnTextBlack: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  matchesList: {
    marginTop: 10,
  },
  matchSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
  },
  matchSelectItemActive: {
    borderColor: '#3B82F6',
  },
  matchSelectText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginLeft: 10,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 6,
  },
  rosterGrid: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
  },
  playerRosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  playerName: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  rosterBtns: {
    flexDirection: 'row',
  },
  teamBtn: {
    backgroundColor: '#374151',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  teamBtnActiveA: {
    backgroundColor: '#10B981',
  },
  teamBtnActiveB: {
    backgroundColor: '#3B82F6',
  },
  teamBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topSpacing: {
    marginTop: 16,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreInputGroup: {
    width: '46%',
  },
  scoreInputLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  scoreInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    padding: 10,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mvpDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mvpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  mvpItemActive: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
  },
  mvpItemText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginLeft: 6,
    fontWeight: '500',
  },
  mvpItemTextActive: {
    color: '#EAB308',
    fontWeight: 'bold',
  },
  subHeader: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 10,
  },
  scoresDisplayCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  scoresDisplayTitle: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scoresDisplayText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  glowingText: {
    color: '#10B981',
  },
  groupHeader: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 4,
  },
});

export default ManageMatchesScreen;
