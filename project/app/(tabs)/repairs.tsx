import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, UserRepairProgress, UserAchievement } from '@/lib/supabase';
import { CircleCheck as CheckCircle, Clock, CirclePlay as PlayCircle, Calendar, Trophy, Target } from 'lucide-react-native';

export default function RepairsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'in-progress' | 'saved'>('all');
  const [userRepairs, setUserRepairs] = useState<UserRepairProgress[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user repair progress - simplified query without relationships
      const { data: repairs, error: repairsError } = await supabase
        .from('User_Repairs_Progress')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (repairsError) throw repairsError;

      // Fetch repair guides separately for each repair
      const repairsWithGuides = [];
      if (repairs && repairs.length > 0) {
        for (const repair of repairs) {
          if (repair.repair_id) {
            const { data: guide } = await supabase
              .from('Repair_Guides')
              .select('*')
              .eq('id', repair.repair_id)
              .single();
            
            repairsWithGuides.push({
              ...repair,
              repair_guides: guide
            });
          } else {
            repairsWithGuides.push(repair);
          }
        }
      }

      // Fetch user achievements - simplified query
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('User_Achievements')
        .select('*')
        .eq('user_id', user?.id);

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
        // Don't throw, achievements are optional
      }

      // Fetch achievement details separately
      const achievementsWithDetails = [];
      if (userAchievements && userAchievements.length > 0) {
        for (const userAchievement of userAchievements) {
          if (userAchievement.achievement_id) {
            const { data: achievement } = await supabase
              .from('Achievements')
              .select('*')
              .eq('id', userAchievement.achievement_id)
              .single();
            
            achievementsWithDetails.push({
              ...userAchievement,
              achievements: achievement
            });
          } else {
            achievementsWithDetails.push(userAchievement);
          }
        }
      }

      setUserRepairs(repairsWithGuides || []);
      setAchievements(achievementsWithDetails || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepairs = userRepairs.filter(repair => {
    if (activeTab === 'all') return true;
    return repair.status === activeTab;
  });

  const handleRepairPress = (repairId: number) => {
    router.push(`/guide/${repairId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="#059669" size={20} strokeWidth={2} />;
      case 'in-progress':
        return <PlayCircle color="#F59E0B" size={20} strokeWidth={2} />;
      case 'saved':
        return <Clock color="#6B7280" size={20} strokeWidth={2} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'saved':
        return 'Saved';
      default:
        return '';
    }
  };

  const completedCount = userRepairs.filter(r => r.status === 'completed').length;
  const inProgressCount = userRepairs.filter(r => r.status === 'in-progress').length;
  const savedCount = userRepairs.filter(r => r.status === 'saved').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading your repairs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Repairs</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.mainStat}>
            <Trophy color="#FFD700" size={24} strokeWidth={2} />
            <Text style={styles.mainStatNumber}>{completedCount}</Text>
            <Text style={styles.mainStatLabel}>Repairs Completed</Text>
          </View>
          <View style={styles.secondaryStats}>
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatNumber}>{inProgressCount}</Text>
              <Text style={styles.secondaryStatLabel}>In Progress</Text>
            </View>
            <View style={styles.secondaryStat}>
              <Text style={styles.secondaryStatNumber}>{savedCount}</Text>
              <Text style={styles.secondaryStatLabel}>Saved</Text>
            </View>
          </View>
        </View>

        {/* Tab Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabFilter}
          contentContainerStyle={styles.tabFilterContent}
        >
          {[
            { key: 'all', label: 'All', count: userRepairs.length },
            { key: 'completed', label: 'Completed', count: completedCount },
            { key: 'in-progress', label: 'In Progress', count: inProgressCount },
            { key: 'saved', label: 'Saved', count: savedCount },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabChip,
                activeTab === tab.key && styles.tabChipActive
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={[
                styles.tabChipText,
                activeTab === tab.key && styles.tabChipTextActive
              ]}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Repairs List */}
        <View style={styles.repairsContainer}>
          {filteredRepairs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No repairs found</Text>
              <Text style={styles.emptyStateSubtext}>
                Start exploring repair guides to track your progress
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => router.push('/(tabs)/categories')}
              >
                <Text style={styles.exploreButtonText}>Explore Guides</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRepairs.map((repair) => (
              <TouchableOpacity
                key={repair.id}
                style={styles.repairCard}
                onPress={() => handleRepairPress(repair.repair_id)}
                activeOpacity={0.7}
              >
                <View style={styles.repairHeader}>
                  <View style={styles.repairStatus}>
                    {getStatusIcon(repair.status)}
                    <Text style={styles.repairStatusText}>
                      {getStatusText(repair.status)}
                    </Text>
                  </View>
                  {repair.completed_date && (
                    <View style={styles.dateContainer}>
                      <Calendar color="#6B7280" size={14} strokeWidth={2} />
                      <Text style={styles.dateText}>
                        {new Date(repair.completed_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.repairTitle}>{repair.repair_guides?.title || 'Unknown Guide'}</Text>
                <Text style={styles.repairCategory}>{repair.repair_guides?.category || 'Unknown Category'}</Text>

                {repair.status === 'in-progress' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${repair.progress || 0}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      Step {repair.current_step || 0} of {repair.repair_guides?.steps_count || 0}
                    </Text>
                  </View>
                )}

                <View style={styles.repairFooter}>
                  <View style={[
                    styles.difficultyBadge,
                    repair.repair_guides?.difficulty === 'Beginner' && styles.beginnerBadge,
                    repair.repair_guides?.difficulty === 'Intermediate' && styles.intermediateBadge,
                    repair.repair_guides?.difficulty === 'Advanced' && styles.advancedBadge,
                  ]}>
                    <Text style={[
                      styles.difficultyText,
                      repair.repair_guides?.difficulty === 'Beginner' && styles.beginnerText,
                      repair.repair_guides?.difficulty === 'Intermediate' && styles.intermediateText,
                      repair.repair_guides?.difficulty === 'Advanced' && styles.advancedText,
                    ]}>
                      {repair.repair_guides?.difficulty || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={styles.repairTime}>{repair.repair_guides?.['estimated time'] || repair.repair_guides?.time_required || 'Unknown'}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Achievements Section */}
        {achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.map((userAchievement) => (
              <View
                key={userAchievement.id}
                style={[
                  styles.achievementCard,
                  !userAchievement.earned && styles.achievementCardLocked
                ]}
              >
                <View style={styles.achievementIcon}>
                  <Target 
                    color={userAchievement.earned ? '#059669' : '#9CA3AF'} 
                    size={20} 
                    strokeWidth={2} 
                  />
                </View>
                <View style={styles.achievementContent}>
                  <Text style={[
                    styles.achievementTitle,
                    !userAchievement.earned && styles.achievementTitleLocked
                  ]}>
                    {userAchievement.achievements?.title || 'Unknown Achievement'}
                  </Text>
                  <Text style={[
                    styles.achievementDescription,
                    !userAchievement.earned && styles.achievementDescriptionLocked
                  ]}>
                    {userAchievement.achievements?.discription || 'No description available'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Built with Bolt</Text>
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
  scrollView: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainStatNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  secondaryStat: {
    alignItems: 'center',
  },
  secondaryStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  secondaryStatLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  tabFilter: {
    marginBottom: 24,
  },
  tabFilterContent: {
    paddingHorizontal: 20,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  tabChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  repairsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  repairCard: {
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
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  repairStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repairStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  repairTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  repairCategory: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  repairFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  beginnerBadge: {
    backgroundColor: '#DCFCE7',
  },
  intermediateBadge: {
    backgroundColor: '#FEF3C7',
  },
  advancedBadge: {
    backgroundColor: '#FEE2E2',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  beginnerText: {
    color: '#166534',
  },
  intermediateText: {
    color: '#92400E',
  },
  advancedText: {
    color: '#991B1B',
  },
  repairTime: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  achievementCard: {
    flexDirection: 'row',
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
  achievementCardLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: '#9CA3AF',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  achievementDescriptionLocked: {
    color: '#D1D5DB',
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
  },
});