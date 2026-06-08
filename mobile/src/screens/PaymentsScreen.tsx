import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import Alert from '../utils/alert';

interface Payment {
  id: string;
  playerId: string;
  amount: string; // Decimal returned as string from Prisma
  status: string; // PENDING, PAID, CANCELLED
  createdAt: string;
  player: {
    name: string;
  };
}

const PaymentsScreen = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { user } = useAuth();

  const isAccountingStaff = user?.role === 'ADMIN' || user?.role === 'TREASURER';

  const fetchPayments = useCallback(async (cursorStr: string | null = null, append = false) => {
    try {
      const response = await apiClient.get('/payments', {
        params: {
          limit: 15,
          ...(cursorStr && { cursor: cursorStr }),
        },
      });
      const { data, nextCursor: next } = response.data;
      setPayments((prev) => (append ? [...prev, ...data] : data));
      setNextCursor(next);
    } catch (e) {
      console.log('Error fetching payments:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // WHY: Automatically refresh the payments financial ledger feed list whenever the screen gains navigation focus.
      fetchPayments();
    }, [fetchPayments])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPayments(null, false);
  };

  const loadMore = () => {
    if (nextCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      fetchPayments(nextCursor, true);
    }
  };

  const handlePay = async (id: string, playerName: string) => {
    Alert.alert(
      'Confirm Payment',
      `Are you sure you want to mark ${playerName}'s payment as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.patch(`/payments/${id}/pay`);
              // Update payment status locally to avoid full refresh
              setPayments((prev) =>
                prev.map((p) => (p.id === id ? { ...p, status: 'PAID' } : p)),
              );
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to update payment.');
            }
          },
        },
      ],
    );
  };

  const handleCancel = async (id: string, playerName: string) => {
    Alert.alert(
      'Cancel Bill',
      `Are you sure you want to cancel ${playerName}'s pending payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.patch(`/payments/${id}/cancel`);
              setPayments((prev) =>
                prev.map((p) => (p.id === id ? { ...p, status: 'CANCELLED' } : p)),
              );
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to cancel payment.');
            }
          },
        },
      ],
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID':
        return styles.statusPaid;
      case 'CANCELLED':
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => {
    const isPending = item.status === 'PENDING';

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.infoCol}>
            {/* Player Name */}
            {isAccountingStaff ? (
              <Text style={styles.playerName}>{item.player.name}</Text>
            ) : (
              <Text style={styles.playerName}>Monthly Contribution</Text>
            )}
            <Text style={styles.dateText}>Issued on {formatDate(item.createdAt)}</Text>
          </View>

          {/* Amount & Status Badge */}
          <View style={styles.valueCol}>
            <Text style={styles.amountText}>{parseFloat(item.amount).toFixed(2)} €</Text>
            <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>

        {/* Administrative Action buttons (Admins & Treasurers only) */}
        {isAccountingStaff && isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => handleCancel(item.id, item.player.name)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.payBtn]}
              onPress={() => handlePay(item.id, item.player.name)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.payBtnText}>Mark Paid</Text>
            </TouchableOpacity>
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
      <View style={styles.headerInfo}>
        <Ionicons name="bar-chart-outline" size={20} color="#10B981" />
        <Text style={styles.headerTitle}>
          {isAccountingStaff ? 'TREASURY LEDGER' : 'MY CONTRIBUTIONS'}
        </Text>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderPaymentItem}
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
            <Ionicons name="card-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No financial logs found.</Text>
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
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    backgroundColor: '#111827',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  valueCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  statusPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  statusCancelled: {
    backgroundColor: '#374151',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  payBtn: {
    backgroundColor: '#10B981',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
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

export default PaymentsScreen;
