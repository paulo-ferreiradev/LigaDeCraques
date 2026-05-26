import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/apiClient';

interface Player {
  id: string;
  name: string;
}

interface Match {
  id: string;
  playedAt: string;
  status: string;
  teamAScore: number | null;
  teamBScore: number | null;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  mvpId: string | null;
  mvp: Player | null;
  season: {
    year: number;
    seasonType: string;
  };
}

const MatchesScreen = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchMatches = useCallback(async (cursorStr: string | null = null, append = false) => {
    try {
      const response = await apiClient.get('/matches', {
        params: {
          limit: 10,
          ...(cursorStr && { cursor: cursorStr }),
        },
      });

      const { data, nextCursor: next } = response.data;

      setMatches((prev) => (append ? [...prev, ...data] : data));
      setNextCursor(next);
    } catch (e) {
      console.log('Error fetching matches:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // WHY: Automatically refresh the matches feed list whenever the screen gains navigation focus.
      fetchMatches();
    }, [fetchMatches])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchMatches(null, false);
  };

  const loadMore = () => {
    if (nextCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      fetchMatches(nextCursor, true);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMatchCard = ({ item }: { item: Match }) => {
    const isCompleted = item.status === 'COMPLETED';
    const teamNamesA = item.teamAPlayers.map((p) => p.name).join(', ');
    const teamNamesB = item.teamBPlayers.map((p) => p.name).join(', ');

    return (
      <View style={styles.card}>
        {/* Top bar: Season & Date */}
        <View style={styles.cardHeader}>
          <Text style={styles.seasonText}>
            {item.season.year} {item.season.seasonType}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.playedAt)}</Text>
        </View>

        {/* Score & Status Area */}
        <View style={styles.scoreRow}>
          <View style={styles.teamScoreSection}>
            <Text style={styles.teamScoreLabel}>TEAM A</Text>
            {isCompleted ? (
              <Text style={styles.scoreNumber}>{item.teamAScore}</Text>
            ) : (
              <Text style={styles.pendingScore}>-</Text>
            )}
          </View>

          <View style={styles.statusDivider}>
            {isCompleted ? (
              <View style={styles.completedPill}>
                <Text style={styles.completedPillText}>FINAL</Text>
              </View>
            ) : (
              <View style={styles.scheduledPill}>
                <Text style={styles.scheduledPillText}>SCHEDULED</Text>
              </View>
            )}
          </View>

          <View style={styles.teamScoreSection}>
            <Text style={styles.teamScoreLabel}>TEAM B</Text>
            {isCompleted ? (
              <Text style={styles.scoreNumber}>{item.teamBScore}</Text>
            ) : (
              <Text style={styles.pendingScore}>-</Text>
            )}
          </View>
        </View>

        {/* Roster Mappings */}
        <View style={styles.rostersArea}>
          <View style={styles.rosterRow}>
            <Ionicons name="shirt" size={14} color="#10B981" />
            <Text style={styles.rosterList} numberOfLines={2}>
              <Text style={styles.boldRosterLabel}>Team A: </Text>
              {teamNamesA || 'No players assigned'}
            </Text>
          </View>

          <View style={[styles.rosterRow, styles.topSpacing]}>
            <Ionicons name="shirt" size={14} color="#3B82F6" />
            <Text style={styles.rosterList} numberOfLines={2}>
              <Text style={styles.boldRosterLabel}>Team B: </Text>
              {teamNamesB || 'No players assigned'}
            </Text>
          </View>
        </View>

        {/* MVP Award Section */}
        {isCompleted && item.mvp && (
          <View style={styles.mvpBanner}>
            <Ionicons name="star" size={16} color="#EAB308" />
            <Text style={styles.mvpText}>
              <Text style={styles.boldMvpLabel}>MVP: </Text>
              {item.mvp.name}
            </Text>
          </View>
        )}
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
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={renderMatchCard}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="football-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No matches scheduled or played yet.</Text>
          </View>
        }
      />
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
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
    marginBottom: 12,
  },
  seasonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  teamScoreSection: {
    alignItems: 'center',
    flex: 1,
  },
  teamScoreLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pendingScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#475569',
  },
  statusDivider: {
    alignItems: 'center',
    width: 90,
  },
  completedPill: {
    backgroundColor: '#374151',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  completedPillText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scheduledPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  scheduledPillText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rostersArea: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topSpacing: {
    marginTop: 10,
  },
  boldRosterLabel: {
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  rosterList: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  mvpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  mvpText: {
    color: '#EAB308',
    fontSize: 12,
    marginLeft: 8,
  },
  boldMvpLabel: {
    fontWeight: 'bold',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default MatchesScreen;
