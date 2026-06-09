import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import Alert from '../utils/alert';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Change password (self-service) state.
  const [showChangePw, setShowChangePw] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  useEffect(() => {
    const fetchPlayerProfile = async () => {
      if (user?.playerId) {
        setIsLoadingPlayer(true);
        try {
          const response = await apiClient.get(`/players/${user.playerId}`);
          setPlayerName(response.data.name);
        } catch (e) {
          console.log('Error fetching linked player profile:', e);
        } finally {
          setIsLoadingPlayer(false);
        }
      }
    };

    fetchPlayerProfile();
  }, [user?.playerId]);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    if (!user?.playerId) return;

    setIsSavingName(true);
    try {
      await apiClient.patch(`/players/${user.playerId}`, { name: editName.trim() });
      setPlayerName(editName.trim());
      setIsEditing(false);
      Alert.alert('Success', 'Profile name updated successfully.');
    } catch (e: any) {
      console.log('Error updating profile name:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to update name.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Validation Error', 'Please fill in your current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword === oldPassword) {
      Alert.alert('Validation Error', 'New password must be different from the current one.');
      return;
    }

    setIsChangingPw(true);
    try {
      // WHY: Backend verifies oldPassword (bcrypt) and invalidates other sessions on success.
      await apiClient.patch('/users/me/password', { oldPassword, newPassword });
      // WHY: The server cleared the refresh token, so the session is no longer renewable. Sign the
      // user out cleanly so they re-authenticate with the new password instead of hitting a silent
      // failure on the next token refresh.
      Alert.alert('Success', 'Password changed. Please log in again with your new password.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePw(false);
      await logout();
    } catch (e: any) {
      console.log('Error changing password:', e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (e) {
      console.log('Error during logout:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={48} color="#FFFFFF" />
        </View>
        {isLoadingPlayer ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#10B981" />
        ) : isEditing ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={styles.editNameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor="#6B7280"
              autoCapitalize="words"
            />
            <View style={styles.editActionsRow}>
              <TouchableOpacity
                style={[styles.editActionBtn, styles.cancelEditBtn]}
                onPress={() => setIsEditing(false)}
                disabled={isSavingName}
              >
                <Ionicons name="close-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editActionBtn, styles.saveEditBtn]}
                onPress={handleSaveName}
                disabled={isSavingName}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Ionicons name="checkmark-outline" size={20} color="#10B981" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : playerName ? (
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{playerName}</Text>
              <TouchableOpacity
                style={styles.editPenIcon}
                onPress={() => {
                  setEditName(playerName);
                  setIsEditing(true);
                }}
              >
                <Ionicons name="pencil-sharp" size={16} color="#10B981" />
              </TouchableOpacity>
            </View>
            <Text style={styles.emailSubText}>{user?.email}</Text>
          </View>
        ) : (
          <Text style={styles.emailText}>{user?.email}</Text>
        )}
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      <View style={styles.detailsCard}>
        {playerName && (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color="#10B981" />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLbl}>LINKED PLAYER PROFILE</Text>
              <Text style={styles.detailVal}>{playerName}</Text>
            </View>
          </View>
        )}

        <View style={[styles.detailRow, playerName ? styles.topSpacing : null]}>
          <Ionicons name="finger-print-outline" size={20} color="#10B981" />
          <View style={styles.detailInfo}>
            <Text style={styles.detailLbl}>USER ID</Text>
            <Text style={styles.detailVal}>{user?.userId}</Text>
          </View>
        </View>

        <View style={[styles.detailRow, styles.topSpacing]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
          <View style={styles.detailInfo}>
            <Text style={styles.detailLbl}>SYSTEM ACCESS CONTROL</Text>
            <Text style={styles.detailVal}>
              {user?.role === 'ADMIN'
                ? 'Full system write permissions'
                : user?.role === 'TREASURER'
                ? 'Financial audit permissions'
                : 'Player read-only profile'}
            </Text>
          </View>
        </View>
      </View>

      {/* Security / Change Password */}
      <View style={styles.securityCard}>
        <TouchableOpacity
          style={styles.securityHeader}
          onPress={() => setShowChangePw((v) => !v)}
        >
          <View style={styles.securityHeaderLeft}>
            <Ionicons name="key-outline" size={20} color="#10B981" />
            <Text style={styles.securityTitle}>Change Password</Text>
          </View>
          <Ionicons
            name={showChangePw ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        {showChangePw && (
          <View style={styles.securityBody}>
            <TextInput
              style={styles.pwInput}
              placeholder="Current password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              autoCapitalize="none"
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.pwInput}
              placeholder="New password (min. 6 characters)"
              placeholderTextColor="#6B7280"
              secureTextEntry
              autoCapitalize="none"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.pwInput}
              placeholder="Confirm new password"
              placeholderTextColor="#6B7280"
              secureTextEntry
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.changePwBtn}
              onPress={handleChangePassword}
              disabled={isChangingPw}
            >
              {isChangingPw ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.changePwBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <Text style={styles.logoutBtnText}>Sign Out of Account</Text>
          </>
        )}
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  securityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 20,
    overflow: 'hidden',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  securityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  securityBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pwInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  changePwBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  changePwBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981', // Glow Emerald border
  },
  emailText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emailSubText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPenIcon: {
    marginLeft: 8,
    padding: 4,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editNameContainer: {
    width: '80%',
    alignItems: 'center',
    marginTop: 16,
  },
  editNameInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    color: '#FFFFFF',
    padding: 10,
    fontSize: 16,
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'center',
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  editActionBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtn: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  saveEditBtn: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  roleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 9999,
    marginTop: 8,
  },
  roleText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topSpacing: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  detailInfo: {
    marginLeft: 16,
    flex: 1,
  },
  detailLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  detailVal: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#EF4444', // Warning Red
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ProfileScreen;
