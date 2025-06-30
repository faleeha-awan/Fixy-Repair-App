import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, RepairGuide, UserRepairProgress } from '@/lib/supabase';
import { Smartphone, Wrench, Sofa, Shirt, Hammer, Search, TrendingUp, Phone, Database, CircleAlert as AlertCircle, RefreshCw } from 'lucide-react-native';

const categories = [
  {
    id: 'Electronics',
    title: 'Electronics',
    icon: Smartphone,
    color: '#3B82F6',
    guides: 0,
    subcategories: [
      { id: 'Phones', title: 'Phones', icon: Phone, color: '#3B82F6' },
      { id: 'iPhone', title: 'iPhone', icon: Phone, color: '#3B82F6' },
      { id: 'Android Phone', title: 'Android', icon: Phone, color: '#34D399' },
      { id: 'iPad', title: 'iPad', icon: Smartphone, color: '#8B5CF6' },
      { id: 'MacBook', title: 'MacBook', icon: Smartphone, color: '#F59E0B' },
    ]
  },
  {
    id: 'Plumbing',
    title: 'Plumbing',
    icon: Wrench,
    color: '#2563EB',
    guides: 0,
  },
  {
    id: 'Furniture',
    title: 'Furniture',
    icon: Sofa,
    color: '#7C3AED',
    guides: 0,
  },
  {
    id: 'Clothing',
    title: 'Clothing',
    icon: Shirt,
    color: '#DC2626',
    guides: 0,
  },
  {
    id: 'Tools',
    title: 'Tools',
    icon: Hammer,
    color: '#059669',
    guides: 0,
  },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repairGuides, setRepairGuides] = useState<RepairGuide[]>([]);
  const [userProgress, setUserProgress] = useState<UserRepairProgress[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({});
  const [subcategoryCounts, setSubcategoryCounts] = useState<{[key: string]: {[key: string]: number}}>({});
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { error: testError } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      if (testError) {
        setConnectionStatus(`Connection failed: ${testError.message}`);
        throw testError;
      }

      setConnectionStatus('Connected ✅');

      const { data: guides, error: guidesError } = await supabase
        .from('Repair_Guides')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (guidesError) throw guidesError;

      const { data: progress } = await supabase
        .from('User_Repairs_Progress')
        .select('*')
        .eq('user_id', user?.id);

      const { data: allGuides, error: countError } = await supabase
        .from('Repair_Guides')
        .select('id, category, subcategory_id, device_name, subject, title');

      if (countError) throw countError;

      const counts: {[key: string]: number} = {};
      const subCounts: {[key: string]: {[key: string]: number}} = {};

      const { data: subcategories } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .not('parent_id', 'is', null);

      const subcategoryMap = new Map();
      subcategories?.forEach(sub => {
        subcategoryMap.set(sub.id, sub.name);
      });

      allGuides?.forEach(guide => {
        if (guide.category) {
          counts[guide.category] = (counts[guide.category] || 0) + 1;
        }

        let subcategoryName = null;
        if (guide.subcategory_id && subcategoryMap.has(guide.subcategory_id)) {
          subcategoryName = subcategoryMap.get(guide.subcategory_id);
        }
        if (!subcategoryName && guide.subject) subcategoryName = guide.subject;
        if (!subcategoryName && guide.device_name) subcategoryName = guide.device_name;

        const title = guide.title?.toLowerCase() || '';
        if (!subcategoryName && guide.category === 'Electronics') {
          if (title.includes('iphone')) subcategoryName = 'iPhone';
          else if (title.includes('ipad')) subcategoryName = 'iPad';
          else if (title.includes('macbook')) subcategoryName = 'MacBook';
          else if (title.includes('android')) subcategoryName = 'Android Phone';
          else if (title.includes('phone')) subcategoryName = 'Phones';
        }

        if (subcategoryName && guide.category) {
          if (!subCounts[guide.category]) subCounts[guide.category] = {};
          subCounts[guide.category][subcategoryName] = 
            (subCounts[guide.category][subcategoryName] || 0) + 1;
        }
      });

      setRepairGuides(guides || []);
      setUserProgress(progress || []);
      setCategoryCounts(counts);
      setSubcategoryCounts(subCounts);
    } catch (error) {
      setConnectionStatus('Error ❌');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => fetchData(true);
  const handleCategoryPress = (categoryId: string, subcategoryId?: string) => {
    if (subcategoryId) {
      router.push(`/(tabs)/categories?category=${categoryId}&subcategory=${subcategoryId}`);
    } else {
      router.push(`/(tabs)/categories?category=${categoryId}`);
    }
  };
  const handleGuidePress = (guideId: number) => router.push(`/guide/${guideId}`);

  const completedRepairs = userProgress.filter(p => p.status === 'completed').length;
  const totalGuides = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading your repairs...</Text>
          <Text style={styles.connectionText}>{connectionStatus}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* ...keep your categories and stats rendering */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Guides</Text>
          {repairGuides.length === 0 ? (
            <Text>No guides found.</Text>
          ) : (
            repairGuides.map((guide) => (
              <TouchableOpacity
                key={guide.id}
                style={styles.guideCard}
                onPress={() => handleGuidePress(guide.id)}
              >
                <Text style={styles.guideTitle}>{guide.title}</Text>
                <Text style={styles.guideCategory}>{guide.category}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // keep existing styles
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280', fontWeight: '500' },
  connectionText: { marginTop: 8, fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  guideCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  guideTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  guideCategory: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});