import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, UserRepairProgress, UserAchievement } from '@/lib/supabase';
import { User, Settings, Bell, CircleHelp as HelpCircle, Shield, LogOut, ChevronRight, Trophy, Star, Clock, Target, Database, Download, FileText } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [userStats, setUserStats] = useState({
    repairsCompleted: 0,
    averageRating: 0,
    totalTimeSpent: '0h 0m',
    achievementsEarned: 0,
  });

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);

      // Fetch user repair progress
      const { data: repairs, error: repairsError } = await supabase
        .from('User Repairs Progress')
        .select('*')
        .eq('user_id', user?.id);

      if (repairsError) throw repairsError;

      // Fetch user achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('User Achievements')
        .select('*')
        .eq('user_id', user?.id)
        .eq('earned', true);

      if (achievementsError) throw achievementsError;

      const completedRepairs = repairs?.filter(r => r.status === 'completed') || [];
      
      setUserStats({
        repairsCompleted: completedRepairs.length,
        averageRating: 4.8,
        totalTimeSpent: '8h 30m',
        achievementsEarned: achievements?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert(
                'Sign Out Failed', 
                error instanceof Error ? error.message : 'An error occurred while signing out. Please try again.'
              );
              setSigningOut(false);
            }
          }
        },
      ]
    );
  };

  const handleMenuPress = (action: string) => {
    switch (action) {
      case 'import-guides':
        router.push('/admin/import-guides');
        break;
      case 'pdf-import':
        router.push('/admin/pdf-import');
        break;
      default:
        console.log('Menu item pressed:', action);
    }
  };

  const menuItems = [
    {
      id: 1,
      title: 'Account Settings',
      icon: Settings,
      action: 'account',
    },
    {
      id: 2,
      title: 'Notifications',
      icon: Bell,
      action: 'notifications',
    },
    {
      id: 3,
      title: 'Help & Support',
      icon: HelpCircle,
      action: 'help',
    },
    {
      id: 4,
      title: 'Privacy Policy',
      icon: Shield,
      action: 'privacy',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User color="#FFFFFF" size={32} strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.userName}>{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.joinedDate}>
            Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Trophy color="#FFD700" size={24} strokeWidth={2} />
            <Text style={styles.statNumber}>{userStats.repairsCompleted}</Text>
            <Text style={styles.statLabel}>Repairs Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Star color="#FF6B35" size={24} strokeWidth={2} />
            <Text style={styles.statNumber}>{userStats.averageRating}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Clock color="#2563EB" size={24} strokeWidth={2} />
            <Text style={styles.statNumber}>{userStats.totalTimeSpent}</Text>
            <Text style={styles.statLabel}>Time Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Target color="#059669" size={24} strokeWidth={2} />
            <Text style={styles.statNumber}>{userStats.achievementsEarned}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Trophy color="#FF6B35" size={20} strokeWidth={2} />
              <Text style={styles.quickActionText}>View Achievements</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Star color="#FF6B35" size={20} strokeWidth={2} />
              <Text style={styles.quickActionText}>Rate Experience</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {/* Notifications Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Bell color="#6B7280" size={20} strokeWidth={2} />
              <Text style={styles.settingItemText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#FF6B35' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          {/* Menu Items */}
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.action)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <IconComponent color="#6B7280" size={20} strokeWidth={2} />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </View>
                <ChevronRight color="#9CA3AF" size={20} strokeWidth={2} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.logoutButton, signingOut && styles.logoutButtonDisabled]} 
            activeOpacity={0.7}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color="#DC2626" size={20} />
            ) : (
              <LogOut color="#DC2626" size={20} strokeWidth={2} />
            )}
            <Text style={[styles.logoutText, signingOut && styles.logoutTextDisabled]}>
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Built with Bolt</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  joinedDate: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  adminFeatureButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  adminFeatureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminFeatureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adminFeatureText: {
    flex: 1,
  },
  adminFeatureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  adminFeatureDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  logoutTextDisabled: {
    color: '#9CA3AF',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '500',
  },
});