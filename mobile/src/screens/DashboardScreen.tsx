import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

interface PlayerStanding {
  playerId: string;
  name: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  mvpCount: number;
  points: number;
}

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

interface Match {
  id: string;
  playedAt: string;
  status: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  season: Season;
}

const DashboardScreen = () => {
  const { user } = useAuth();
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [pendingVoteMatches, setPendingVoteMatches] = useState<Match[]>([]);
  const [pendingRsvpMatches, setPendingRsvpMatches] = useState<any[]>([]);
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  
  // Voting Form States
  const [selectedVotingMatch, setSelectedVotingMatch] = useState<Match | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSeasonData = useCallback(async () => {
    try {
      setErrorMsg(null);
      
      let season: Season | null = null;
      try {
        // 1. Fetch currently active season
        const seasonResponse = await apiClient.get('/seasons/active');
        season = seasonResponse.data;
        setActiveSeason(season);
      } catch (err: any) {
        if (err.response?.status === 404) {
          // WHY: If no active season is set in the database, handle 404 gracefully 
          // to let the rest of the dashboard (like RSVPs and Hall of Fame) render beautifully.
          setActiveSeason(null);
          setStandings([]);
        } else {
          throw err;
        }
      }

      if (season) {
        // 2. Fetch leaderboard standings for that season
        const leaderboardResponse = await apiClient.get(`/seasons/${season.id}/leaderboard`);
        setStandings(leaderboardResponse.data);
      }

      // 3. Check and load RSVP/Voting data if player profile exists
      if (user?.playerId) {
        // WHY: Get player profile first to determine playerType.
        // Guest players do not respond to RSVPs.
        const playerResponse = await apiClient.get(`/players/${user.playerId}`);
        const isFixedPlayer = playerResponse.data.playerType === 'FIXED';

        const matchesResponse = await apiClient.get('/matches', { params: { limit: 15 } });
        const allMatches = matchesResponse.data.data;

        // Fetch RSVPs only if the player is FIXED
        if (isFixedPlayer) {
          const scheduledMatches = allMatches.filter((m: any) => m.status === 'SCHEDULED');
          const activeScheduled = scheduledMatches.filter((m: any) =>
            m.rsvpDeadline && new Date() < new Date(m.rsvpDeadline)
          );

          const rsvpPendingList: any[] = [];
          for (const match of activeScheduled) {
            try {
              const rsvpCheck = await apiClient.get(`/matches/${match.id}/rsvp/my`);
              if (rsvpCheck.data && rsvpCheck.data.status === 'PENDING') {
                rsvpPendingList.push({ match, userRsvp: rsvpCheck.data });
              }
            } catch (err) {
              console.log('Error checking RSVP:', err);
            }
          }
          setPendingRsvpMatches(rsvpPendingList);
        } else {
          setPendingRsvpMatches([]);
        }

        // Fetch Voting Matches
        const votingMatches = allMatches.filter((m: any) => m.status === 'VOTING');
        const userParticipatedMatches = votingMatches.filter((m: any) =>
          m.teamAPlayers.some((p: any) => p.id === user.playerId) ||
          m.teamBPlayers.some((p: any) => p.id === user.playerId)
        );

        const pendingVotes: Match[] = [];
        for (const match of userParticipatedMatches) {
          try {
            const voteCheck = await apiClient.get(`/matches/${match.id}/votes/my`);
            if (!voteCheck.data) {
              pendingVotes.push(match);
            }
          } catch (err) {
            console.log('Error checking vote status:', err);
          }
        }
        setPendingVoteMatches(pendingVotes);
      }

      // 4. Fetch historic champions Hall of Fame
      try {
        const hofResponse = await apiClient.get('/seasons/hall-of-fame');
        setHallOfFame(hofResponse.data);
      } catch (err) {
        console.log('Error loading Hall of Fame in dashboard:', err);
      }
    } catch (e: any) {
      console.log('Error fetching standings:', e);
      setErrorMsg('Failed to load standings leaderboard.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.playerId]);

  useFocusEffect(
    useCallback(() => {
      // WHY: Dynamically refresh season standings, active convocatórias, and HOF whenever screen comes into focus.
      fetchSeasonData();
    }, [fetchSeasonData])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSeasonData();
  };

  const handleRsvpSubmit = async (matchId: string, status: 'CONFIRMED' | 'DECLINED') => {
    setIsSubmittingRsvp(true);
    try {
      await apiClient.post(`/matches/${matchId}/rsvp`, { status });
      Alert.alert(
        'Success',
        status === 'CONFIRMED'
          ? 'Attendance confirmed! See you on the pitch!'
          : 'Absence recorded. We will miss you!'
      );
      fetchSeasonData();
    } catch (e: any) {
      console.log('Error submitting RSVP:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit RSVP.');
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const renderRsvpSection = () => {
    if (pendingRsvpMatches.length === 0) return null;

    // WHY: Use the first pending RSVP match for display.
    const { match } = pendingRsvpMatches[0];
    const matchDate = new Date(match.playedAt).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    // WHY: Format the RSVP response deadline to inform players.
    const deadlineDate = match.rsvpDeadline
      ? new Date(match.rsvpDeadline).toLocaleDateString('pt-PT', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    return (
      <View style={styles.rsvpGlowCard}>
        <View style={styles.rsvpHeader}>
          <Ionicons name="notifications" size={20} color="#10B981" />
          <Text style={styles.rsvpHeaderTitle}>CONVOCATÓRIA ATIVA</Text>
        </View>
        <Text style={styles.rsvpDesc}>
          Match Kick-off: <Text style={{ fontWeight: 'bold', color: '#FFFFFF' }}>{matchDate}</Text>
          {'\n'}
          Response Deadline: <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{deadlineDate}</Text>
        </Text>
        <Text style={styles.rsvpPromptText}>
          Can you play in this match? Confirm your attendance below.
        </Text>

        <View style={styles.rsvpActionRow}>
          <TouchableOpacity
            style={[styles.rsvpDeclineBtn, isSubmittingRsvp && { opacity: 0.5 }]}
            onPress={() => handleRsvpSubmit(match.id, 'DECLINED')}
            disabled={isSubmittingRsvp}
          >
            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.rsvpDeclineText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rsvpConfirmBtn, isSubmittingRsvp && { opacity: 0.5 }]}
            onPress={() => handleRsvpSubmit(match.id, 'CONFIRMED')}
            disabled={isSubmittingRsvp}
          >
            {isSubmittingRsvp ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#0F172A" />
                <Text style={styles.rsvpConfirmText}>Confirm Attendance</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleCastVote = async () => {
    if (!selectedVotingMatch || !selectedCandidateId) {
      Alert.alert('Validation Error', 'Please select a player to vote.');
      return;
    }

    setIsSubmittingVote(true);
    try {
      await apiClient.post(`/matches/${selectedVotingMatch.id}/votes`, {
        candidateId: selectedCandidateId,
      });
      Alert.alert('Success', 'Thank you! Your MVP vote has been recorded anonymously.');
      setSelectedVotingMatch(null);
      setSelectedCandidateId(null);
      fetchSeasonData();
    } catch (e: any) {
      console.log('Error casting vote:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit vote.');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const renderVotingSection = () => {
    if (pendingVoteMatches.length === 0) return null;

    // Use the first pending match for display
    const match = pendingVoteMatches[0];
    const isExpanded = selectedVotingMatch?.id === match.id;
    const candidates = [...match.teamAPlayers, ...match.teamBPlayers];
    const matchDate = new Date(match.playedAt).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.voteGlowCard}>
        <View style={styles.voteHeader}>
          <Ionicons name="sparkles" size={20} color="#EAB308" />
          <Text style={styles.voteHeaderTitle}>MVP VOTING OPEN!</Text>
        </View>
        <Text style={styles.voteDesc}>
          Cast your anonymous vote for the Man of the Match played on {matchDate}.
        </Text>

        {!isExpanded ? (
          <TouchableOpacity
            style={styles.voteOpenBtn}
            onPress={() => {
              setSelectedVotingMatch(match);
              setSelectedCandidateId(null);
            }}
          >
            <Text style={styles.voteOpenBtnText}>Open Voting Panel</Text>
            <Ionicons name="chevron-down" size={16} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={styles.voteExpandedPanel}>
            <Text style={styles.selectLabel}>Select Match MVP candidate:</Text>
            <View style={styles.candidatesGrid}>
              {candidates.map((item) => {
                const isSelected = selectedCandidateId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.candidateCard, isSelected && styles.candidateCardSelected]}
                    onPress={() => setSelectedCandidateId(isSelected ? null : item.id)}
                  >
                    <Ionicons name="star" size={12} color={isSelected ? '#EAB308' : '#475569'} />
                    <Text style={[styles.candidateName, isSelected && styles.candidateNameSelected]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.voteActionRow}>
              <TouchableOpacity
                style={styles.voteCancelBtn}
                onPress={() => {
                  setSelectedVotingMatch(null);
                  setSelectedCandidateId(null);
                }}
                disabled={isSubmittingVote}
              >
                <Text style={styles.voteCancelText}>Minimize</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.voteSubmitBtn}
                onPress={handleCastVote}
                disabled={isSubmittingVote || !selectedCandidateId}
              >
                {isSubmittingVote ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.voteSubmitText}>Submit Vote</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderLeaderCard = () => {
    if (standings.length === 0) return null;
    const leader = standings[0];

    return (
      <View style={styles.leaderCard}>
        <View style={styles.leaderBadge}>
          <Ionicons name="trophy" size={24} color="#EAB308" />
          <Text style={styles.leaderBadgeText}>LEAGUE LEADER</Text>
        </View>
        <Text style={styles.leaderName}>{leader.name}</Text>
        <View style={styles.leaderStatsGrid}>
          <View style={styles.leaderStatItem}>
            <Text style={styles.leaderStatVal}>{leader.points}</Text>
            <Text style={styles.leaderStatLbl}>POINTS</Text>
          </View>
          <View style={styles.leaderStatItem}>
            <Text style={styles.leaderStatVal}>{leader.matchesPlayed}</Text>
            <Text style={styles.leaderStatLbl}>PLAYED</Text>
          </View>
          <View style={styles.leaderStatItem}>
            <Text style={styles.leaderStatVal}>{leader.mvpCount}</Text>
            <Text style={styles.leaderStatLbl}>MVPS</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHallOfFame = () => {
    if (hallOfFame.length === 0) return null;

    return (
      <View style={styles.hofContainer}>
        <View style={styles.hofHeader}>
          <Ionicons name="ribbon" size={22} color="#EAB308" />
          <Text style={styles.hofTitle}>👑 HALL OF FAME</Text>
        </View>
        <Text style={styles.hofSubtitle}>Historic champions of Liga Craques.</Text>

        <View style={styles.hofList}>
          {hallOfFame.map((item, index) => {
            return (
              <View key={item.playerId} style={styles.hofItem}>
                <View style={styles.hofRankCol}>
                  <Text style={styles.hofRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.hofInfoCol}>
                  <Text style={styles.hofNameText}>{item.name}</Text>
                  <Text style={styles.hofSeasonsText}>{item.seasons.join(', ')}</Text>
                </View>
                <View style={styles.hofBadgeCol}>
                  <Ionicons name="trophy" size={14} color="#EAB308" />
                  <Text style={styles.hofBadgeText}>
                    {item.titlesCount} {item.titlesCount === 1 ? 'Title' : 'Titles'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStandingRow = ({ item, index }: { item: PlayerStanding; index: number }) => {
    const isFirst = index === 0;
    
    return (
      <View style={[styles.row, isFirst && styles.firstRowHighlight]}>
        {/* Rank */}
        <View style={styles.rankCol}>
          {isFirst ? (
            <Ionicons name="ribbon" size={20} color="#EAB308" />
          ) : (
            <Text style={styles.rankText}>{index + 1}</Text>
          )}
        </View>

        {/* Name */}
        <View style={styles.nameCol}>
          <Text style={styles.nameText} numberOfLines={1}>
            {item.name}
          </Text>
          {item.mvpCount > 0 && (
            <View style={styles.mvpBadge}>
              <Ionicons name="star" size={10} color="#EAB308" />
              <Text style={styles.mvpBadgeText}>{item.mvpCount} MVP</Text>
            </View>
          )}
        </View>

        {/* Stats Columns */}
        <Text style={styles.statCol}>{item.matchesPlayed}</Text>
        <Text style={[styles.statCol, styles.winCol]}>{item.wins}</Text>
        <Text style={styles.statCol}>{item.draws}</Text>
        <Text style={[styles.statCol, styles.lossCol]}>{item.losses}</Text>
        
        {/* Points Column */}
        <View style={styles.ptsCol}>
          <Text style={styles.ptsText}>{item.points}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={standings}
          keyExtractor={(item) => item.playerId}
          renderItem={renderStandingRow}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />
          }
          ListHeaderComponent={
            <>
              {activeSeason && (
                <View style={styles.seasonHeader}>
                  <Text style={styles.seasonTitle}>
                    {activeSeason.year} {activeSeason.seasonType} SEASON
                  </Text>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                </View>
              )}
              {renderRsvpSection()}
              {renderVotingSection()}
              {renderLeaderCard()}
              
              {/* Table Column Headers */}
              {standings.length > 0 && (
                <View style={styles.tableHeaderRow}>
                  <Text style={styles.rankColHeader}>#</Text>
                  <Text style={styles.nameColHeader}>PLAYER</Text>
                  <Text style={styles.statColHeader}>P</Text>
                  <Text style={[styles.statColHeader, styles.winCol]}>W</Text>
                  <Text style={styles.statColHeader}>D</Text>
                  <Text style={[styles.statColHeader, styles.lossCol]}>L</Text>
                  <Text style={styles.ptsColHeader}>PTS</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={activeSeason ? "folder-open-outline" : "calendar-outline"} 
                size={48} 
                color="#6B7280" 
              />
              <Text style={styles.emptyText}>
                {activeSeason 
                  ? "No match records completed in this season yet."
                  : "No active football season is running right now. Standings will appear here once a season is activated in the control hub."}
              </Text>
            </View>
          }
          ListFooterComponent={renderHallOfFame()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  seasonTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  activePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
  },
  activePillText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 11,
  },
  leaderCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAB308', // Beautiful gold border
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  leaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaderBadgeText: {
    color: '#EAB308',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  leaderName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  leaderStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  leaderStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  leaderStatVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  leaderStatLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '600',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  rankColHeader: {
    width: 32,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nameColHeader: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingLeft: 8,
  },
  statColHeader: {
    width: 28,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ptsColHeader: {
    width: 44,
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#0F172A',
  },
  firstRowHighlight: {
    backgroundColor: 'rgba(234, 179, 8, 0.03)', // Subtle gold glow for rank #1
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  nameCol: {
    flex: 1,
    paddingLeft: 8,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mvpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  mvpBadgeText: {
    color: '#EAB308',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  statCol: {
    width: 28,
    color: '#E2E8F0',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  winCol: {
    color: '#10B981', // Win is emerald green
  },
  lossCol: {
    color: '#EF4444', // Loss is red
  },
  ptsCol: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptsText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  voteGlowCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981', // Glow emerald border
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  voteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  voteHeaderTitle: {
    color: '#EAB308',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  voteDesc: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  voteOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
  },
  voteOpenBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 6,
  },
  voteExpandedPanel: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  selectLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  candidatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  candidateCardSelected: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
  },
  candidateName: {
    color: '#9CA3AF',
    fontSize: 11,
    marginLeft: 6,
    fontWeight: '500',
  },
  candidateNameSelected: {
    color: '#EAB308',
    fontWeight: 'bold',
  },
  voteActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  voteCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteCancelText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  voteSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  voteSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  rsvpGlowCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  rsvpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rsvpHeaderTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  rsvpDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  rsvpPromptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  rsvpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  rsvpDeclineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 0.45,
  },
  rsvpDeclineText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  rsvpConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flex: 0.45,
  },
  rsvpConfirmText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  hofContainer: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginVertical: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EAB308',
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  hofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  hofTitle: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    letterSpacing: 1,
  },
  hofSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  hofList: {
    marginTop: 8,
  },
  hofItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  hofRankCol: {
    width: 36,
  },
  hofRankText: {
    color: '#EAB308',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hofInfoCol: {
    flex: 1,
  },
  hofNameText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hofSeasonsText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  hofBadgeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  hofBadgeText: {
    color: '#EAB308',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default DashboardScreen;
