import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, RepairGuide } from '@/lib/supabase';
import { Search, Filter, Smartphone, Wrench, Sofa, Shirt, Hammer, Clock, Star, Phone, User, ExternalLink, RefreshCw, Database, CircleAlert as AlertCircle, Download, Car, Chrome as Home, Laptop, Gamepad2, Camera, Headphones, Watch, Tablet, Monitor, Printer, Router, Tv, Microwave, Refrigerator, WashingMachine, AirVent, Lightbulb, Settings } from 'lucide-react-native';


// Icon mapping for dynamic categories
const lucideIconsMap: { [key: string]: React.ComponentType<any> } = {
  'Smartphone': Smartphone,
  'Phone': Phone,
  'Wrench': Wrench,
  'Hammer': Hammer,
  'Sofa': Sofa,
  'Shirt': Shirt,
  'Car': Car,
  'Home': Home,
  'Laptop': Laptop,
  'Gamepad2': Gamepad2,
  'Camera': Camera,
  'Headphones': Headphones,
  'Watch': Watch,
  'Tablet': Tablet,
  'Monitor': Monitor,
  'Printer': Printer,
  'Router': Router,
  'Tv': Tv,
  'Microwave': Microwave,
  'Refrigerator': Refrigerator,
  'WashingMachine': WashingMachine,
  'AirVent': AirVent,
  'Lightbulb': Lightbulb,
  'Settings': Settings,
};

export default function CategoriesScreen() {
  const { user } = useAuth();
  const { category: initialCategory, subcategory: initialSubcategory } = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory as string || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory as string || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [repairGuides, setRepairGuides] = useState<RepairGuide[]>([]);
  const [allGuides, setAllGuides] = useState<RepairGuide[]>([]);
  const [subcategories, setSubcategories] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<{[key: string]: any[]}>({});
  const [selectedSubSub, setSelectedSubSub] = useState('');


  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [allGuides, selectedCategory, selectedSubcategory, searchQuery]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setConnectionStatus('Connecting...');

      // Test connection
      const { error: testError } = await supabase
        .from('categories')
        .select('count')
        .limit(1);
      
      if (testError) {
        setConnectionStatus('Failed ❌');
        throw testError;
      }
      
      setConnectionStatus('Connected ✅');

      await Promise.all([
        fetchSubcategories(),
        fetchAllRepairGuides()
      ]);

    } catch (error) {
      console.error('Error fetching data:', error);
      setConnectionStatus('Error ❌');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

const fetchSubcategories = async () => {
  const { data: allCategories } = await supabase
    .from('categories').select('id, name, parent_id, icon_name');

  const mapById: any = {};
  const subcatMap: any = {};
  const subSubcatMap: any = {};

  allCategories.forEach(c => mapById[c.id] = c);

  allCategories.forEach(c => {
    if (c.parent_id) {
      const parent = mapById[c.parent_id];
      if (!parent) return;

      if (parent.parent_id) {
        // It's a sub‑sub‑category
        if (!subSubcatMap[parent.name]) subSubcatMap[parent.name] = [];
        subSubcatMap[parent.name].push(c);
      } else {
        // It's a sub‑category
        if (!subcatMap[parent.name]) subcatMap[parent.name] = [];
        subcatMap[parent.name].push(c);
      }
    }
  });

  setSubcategories(subcatMap);
  setSubSubcategories(subSubcatMap);
  setDynamicCategories(allCategories
    .filter(c => !c.parent_id)
    .map(c => ({ ...c, icon: lucideIconsMap[c.icon_name] || Settings, color: '#6B7280' })));
};

  const handleSubSubSelect = (name: string) => {
  setSelectedSubSub(prev => prev === name ? '' : name);
  setSearchQuery('');
};


  const fetchAllRepairGuides = async () => {
    try {
      const { data, error } = await supabase
        .from('Repair_Guides')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAllGuides(data || []);
      
    } catch (error) {
      console.error('Error fetching repair guides:', error);
      throw error;
    }
  };

const applyFilters = () => {
  let filteredData = [...allGuides];

  // Get all relevant subcategory IDs based on selected category
  let allowedSubcategoryIds: string[] = [];

  if (selectedCategory) {
    // Get subcategories for the selected category
    const subs = subcategories[selectedCategory] || [];

    // Get sub-subcategories from those subcategories
    subs.forEach(sub => {
      allowedSubcategoryIds.push(sub.id);
      const subSubs = subcategories[sub.name];
      if (subSubs && Array.isArray(subSubs)) {
        subSubs.forEach(subSub => allowedSubcategoryIds.push(subSub.id));
      }
    });
  }

  if (selectedSubcategory) {
    const match = Object.values(subcategories)
      .flat()
      .find(sub => sub.name.toLowerCase() === selectedSubcategory.toLowerCase());

    if (match) {
      allowedSubcategoryIds = [match.id];

      // Include sub-subcategories if present
      const subSubs = subcategories[selectedSubcategory];
      if (subSubs && Array.isArray(subSubs)) {
        subSubs.forEach(subSub => allowedSubcategoryIds.push(subSub.id));
      }
    }
  }

  if (allowedSubcategoryIds.length > 0) {
    filteredData = filteredData.filter(guide =>
      guide.subcategory_id && allowedSubcategoryIds.includes(guide.subcategory_id)
    );
  }

  if (searchQuery) {
    filteredData = filteredData.filter(guide =>
      guide.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  setRepairGuides(filteredData);
};







  const handleRefresh = () => {
    fetchData(true);
  };

  const handleGuidePress = (guideId: number) => {
    router.push(`/guide/${guideId}`);
  };

  const handleCategorySelect = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      // If already selected, reset both category and subcategory
      setSelectedCategory('');
      setSelectedSubcategory('');
    } else {
      // Select new category and reset any previously selected subcategory
      setSelectedCategory(categoryName);
      setSelectedSubcategory('');
    }
  };

  const handleSubcategorySelect = (subcategoryName: string) => {
    if (selectedSubcategory === subcategoryName) {
      setSelectedSubcategory('');
    } else {
      setSelectedSubcategory(subcategoryName);
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repair Guides</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw 
              color="#6B7280" 
              size={18} 
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <Database color="#3B82F6" size={16} strokeWidth={2} />
        <Text style={styles.statusText}>{connectionStatus}</Text>
        <Text style={styles.guidesCount}>
          {allGuides.length} total guides • {repairGuides.length} filtered
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color="#6B7280" size={20} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search repair guides..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive
          ]}
          onPress={() => handleCategorySelect('')}
        >
          <Text style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>
       {dynamicCategories.map((category) => {
          const IconComponent = category.icon;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.name && styles.categoryChipActive
              ]}
              onPress={() => handleCategorySelect(category.name)}
            >
              <IconComponent 
                color={selectedCategory === category.name ? '#FFFFFF' : category.color} 
                size={16} 
                strokeWidth={2} 
              />
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.name && styles.categoryChipTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Subcategory Filter */}
      {selectedCategory && subcategories[selectedCategory] && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subcategoryFilter}
          contentContainerStyle={styles.categoryFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.subcategoryChip,
              !selectedSubcategory && styles.subcategoryChipActive
            ]}
            onPress={() => setSelectedSubcategory('')}
          >
            <Text style={[
              styles.subcategoryChipText,
              !selectedSubcategory && styles.subcategoryChipTextActive
            ]}>
              All {selectedCategory}
            </Text>
          </TouchableOpacity>
          {subcategories[selectedCategory].map((subcategory) => (
            <TouchableOpacity
              key={subcategory.id}
              style={[
                styles.subcategoryChip,
                selectedSubcategory === subcategory.name && styles.subcategoryChipActive
              ]}
              onPress={() => handleSubcategorySelect(subcategory.name)}
            >
              <Phone 
                color={selectedSubcategory === subcategory.name ? '#FFFFFF' : '#3B82F6'} 
                size={14} 
                strokeWidth={2} 
              />
              <Text style={[
                styles.subcategoryChipText,
                selectedSubcategory === subcategory.name && styles.subcategoryChipTextActive
              ]}>
                {subcategory.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

     {/* SUB‑SUBCATEGORY bar */}
{selectedSubcategory && subSubcategories[selectedSubcategory]?.length > 0 && (
  <ScrollView horizontal style={styles.subcategoryFilter} contentContainerStyle={styles.categoryFilterContent}>
    <TouchableOpacity
      style={[styles.subcategoryChip, !selectedSubSub && styles.subcategoryChipActive]}
      onPress={() => setSelectedSubSub('')}
    >
      <Text style={[styles.subcategoryChipText, !selectedSubSub && styles.subcategoryChipTextActive]}>
        All {selectedSubcategory}
      </Text>
    </TouchableOpacity>
    {subSubcategories[selectedSubcategory].map(sub => (
      <TouchableOpacity
        key={sub.id}
        style={[styles.subcategoryChip, selectedSubSub === sub.name && styles.subcategoryChipActive]}
        onPress={() => handleSubSubSelect(sub.name)}
      >
        <Phone color={selectedSubSub === sub.name ? '#FFF' : '#3B82F6'} size={14} />
        <Text style={[styles.subcategoryChipText, selectedSubSub === sub.name && styles.subcategoryChipTextActive]}>
          {sub.name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}
      {/* Guides List */}
      <ScrollView 
        style={styles.guidesContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading guides...</Text>
          </View>
        ) : repairGuides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle color="#9CA3AF" size={48} strokeWidth={2} />
            <Text style={styles.emptyTitle}>No guides found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or search terms to find repair guides.
            </Text>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          repairGuides.map((guide) => (
            <TouchableOpacity
              key={guide.id}
              style={styles.guideCard}
              onPress={() => handleGuidePress(guide.id)}
              activeOpacity={0.7}
            >
              <View style={styles.guideContent}>
                <View style={styles.guideHeader}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  {guide.subject && (
                    <View style={styles.subcategoryBadge}>
                      <Phone color="#3B82F6" size={12} strokeWidth={2} />
                      <Text style={styles.subcategoryBadgeText}>
                        {guide.subject}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.guideCategory}>{guide.category}</Text>
                
                
                <View style={styles.guideStats}>
                  <View style={styles.statItem}>
                    <Clock color="#6B7280" size={14} strokeWidth={2} />
                    <Text style={styles.statText}>{guide.time_required || guide['estimated time']}</Text>
                  </View>
                  {guide.steps_count && (
                    <Text style={styles.completionsText}>
                      {guide.steps_count} steps
                    </Text>
                  )}
                </View>

                <View style={styles.guideFooter}>
                  <View style={[
                    styles.difficultyBadge,
                    guide.difficulty === 'Beginner' && styles.beginnerBadge,
                    guide.difficulty === 'Intermediate' && styles.intermediateBadge,
                    guide.difficulty === 'Advanced' && styles.advancedBadge,
                  ]}>
                    <Text style={[
                      styles.difficultyText,
                      guide.difficulty === 'Beginner' && styles.beginnerText,
                      guide.difficulty === 'Intermediate' && styles.intermediateText,
                      guide.difficulty === 'Advanced' && styles.advancedText,
                    ]}>
                      {guide.difficulty}
                    </Text>
                  </View>
                  {guide.ifixit_guide_id && (
                    <Text style={styles.idText}>#{guide.ifixit_guide_id}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  guidesCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  categoryFilter: {
    marginBottom: 16,
  },
  subcategoryFilter: {
    marginBottom: 24,
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  subcategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  subcategoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  subcategoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  subcategoryChipTextActive: {
    color: '#FFFFFF',
  },
  guidesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guideCard: {
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
  guideContent: {
    flex: 1,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  subcategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subcategoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  guideCategory: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  guideMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  authorText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  guideStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  completionsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  guideFooter: {
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
  idText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});