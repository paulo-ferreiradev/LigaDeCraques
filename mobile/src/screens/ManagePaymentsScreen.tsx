import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';

interface Player {
  id: string;
  name: string;
  playerType: string;
}

const ManagePaymentsScreen = ({ navigation }: any) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [amount, setAmount] = useState('14.00'); // WHY: Default to standard fixed player monthly fee
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // WHY: Load all active players on mount to populate the billing dropdown list.
    const fetchPlayers = async () => {
      setIsLoadingPlayers(true);
      try {
        const response = await apiClient.get('/players');
        setPlayers(response.data);
      } catch (e: any) {
        console.log('Error fetching players:', e);
        Alert.alert('Error', 'Failed to load players list.');
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, []);

  // WHY: Update default invoice amount dynamically based on selected player type to save clicks.
  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setSearchQuery(player.name);
    setShowDropdown(false);
    
    if (player.playerType === 'GUEST') {
      setAmount('3.00');
    } else {
      setAmount('14.00');
    }
  };

  const handleIssueInvoice = async () => {
    if (!selectedPlayer) {
      Alert.alert('Validation Error', 'Please select a player to issue an invoice.');
      return;
    }

    // WHY: Replace commas with dots to support Portuguese locale keyboard formats.
    const cleanAmount = amount.replace(',', '.');
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive billing amount.');
      return;
    }

    // WHY: Round the float to exactly 2 decimal places to completely avoid JS float binary precision errors 
    // that trigger the class-validator @IsNumber decimal places 400 error.
    const numericAmount = Math.round(parsedAmount * 100) / 100;

    setIsSubmitting(true);
    try {
      await apiClient.post('/payments', {
        playerId: selectedPlayer.id,
        amount: numericAmount,
      });

      Alert.alert(
        'Success',
        `Successfully issued an invoice of ${numericAmount.toFixed(2)} € to ${selectedPlayer.name}!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      console.log('Error creating payment:', e);
      // WHY: Join validation array messages cleanly with a newline to display friendly specific feedback to Admins.
      const errorMsg = Array.isArray(e.response?.data?.message)
        ? e.response.data.message.join('\n')
        : e.response?.data?.message || 'Failed to issue billing payment.';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet-outline" size={28} color="#10B981" />
              <Text style={styles.title}>Issue Treasury Invoice</Text>
            </View>
            <Text style={styles.desc}>
              Select a player to post a new billing invoice to their ledger. Fixed players pay a 14.00 € monthly fee, while Guest players pay 3.00 € per match.
            </Text>

            {/* Player Selection Dropdown Input */}
            <Text style={styles.label}>Select Player</Text>
            <View style={styles.dropdownContainer}>
              <View style={styles.inputSearchWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Type player name..."
                  placeholderTextColor="#6B7280"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (selectedPlayer && selectedPlayer.name !== text) {
                      setSelectedPlayer(null);
                    }
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearIcon}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedPlayer(null);
                      setShowDropdown(true);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dynamic searchable overlay dropdown */}
              {showDropdown && (
                <View style={styles.dropdownListContainer}>
                  {isLoadingPlayers ? (
                    <ActivityIndicator style={{ padding: 12 }} color="#10B981" />
                  ) : filteredPlayers.length === 0 ? (
                    <Text style={styles.noPlayersText}>No players found</Text>
                  ) : (
                    <FlatList
                      data={filteredPlayers}
                      keyExtractor={(item) => item.id}
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 150 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => handleSelectPlayer(item)}
                        >
                          <Text style={styles.dropdownItemText}>{item.name}</Text>
                          <Text
                            style={[
                              styles.badge,
                              item.playerType === 'FIXED'
                                ? styles.fixedBadge
                                : styles.guestBadge,
                            ]}
                          >
                            {item.playerType}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Display Selected Player Context Badge */}
            {selectedPlayer && (
              <View style={styles.playerInfoCard}>
                <Ionicons name="person" size={20} color="#E2E8F0" />
                <View style={styles.playerInfoDetails}>
                  <Text style={styles.playerInfoName}>{selectedPlayer.name}</Text>
                  <Text style={styles.playerInfoType}>
                    Type: <Text style={selectedPlayer.playerType === 'FIXED' ? styles.fixedText : styles.guestText}>{selectedPlayer.playerType}</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Amount Field Input */}
            <Text style={styles.label}>Invoice Amount (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            {/* Action Trigger Button */}
            <TouchableOpacity
              style={[styles.button, !selectedPlayer && styles.disabledButton]}
              onPress={handleIssueInvoice}
              disabled={isSubmitting || !selectedPlayer}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Issue Invoice</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  desc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 16,
  },
  inputSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    paddingRight: 40,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  clearIcon: {
    position: 'absolute',
    right: 14,
  },
  dropdownListContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  fixedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
  },
  guestBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3B82F6',
  },
  noPlayersText: {
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 12,
    fontSize: 13,
  },
  playerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  playerInfoDetails: {
    marginLeft: 12,
  },
  playerInfoName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerInfoType: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  fixedText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  guestText: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#065F46',
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ManagePaymentsScreen;
