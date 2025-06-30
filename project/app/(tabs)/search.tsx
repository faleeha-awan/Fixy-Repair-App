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
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Filter, ExternalLink, Clock, Globe, RefreshCw, Zap, CircleAlert as AlertCircle } from 'lucide-react-native';

interface SearchResult {
  id?: string;
  title: string;
  source_url: string;
  image_url?: string;
  source_name: string;
  description?: string;
  relevance_score?: number;
}

interface SearchHistory {
  id: string;
  query: string;
  created_at: string;
  results_count: number;
}

export default function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState(['all']);
  const [showFilters, setShowFilters] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sources = [
    { id: 'all', name: 'All Sources', icon: Globe },
    { id: 'ifixit', name: 'iFixit', icon: Zap },
    { id: 'reddit', name: 'Reddit', icon: RefreshCw },
    { id: 'youtube', name: 'YouTube', icon: ExternalLink },
  ];

  useEffect(() => {
    if (user) {
      fetchSearchHistory();
    }
  }, [user]);

  const fetchSearchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_search_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSearchHistory(data || []);
    } catch (error) {
      console.error('Error fetching search history:', error);
    }
  };

  const saveSearchToHistory = async (searchQuery: string, resultsCount: number) => {
    if (!user) return;

    try {
      await supabase
        .from('user_search_history')
        .insert({
          user_id: user.id,
          query: searchQuery,
          results_count: resultsCount,
        });

      fetchSearchHistory();
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) {
      setError('Please enter at least 2 characters to search.');
      return;
    }

    setLoading(true);
    setResults([]);
    setError(null);

    try {
      console.log('🔍 Starting search for:', query);
      
      const response = await fetch('/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          sources: selectedSources,
        }),
      });

      console.log('📡 Search response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Search response error:', errorText);
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Search response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      const searchResults = data.results || [];
      console.log(`✅ Received ${searchResults.length} search results`);

      setResults(searchResults);
      setCached(data.cached || false);

      // Save to search history
      if (user && searchResults.length > 0) {
        await saveSearchToHistory(query.trim(), searchResults.length);
      }

      if (searchResults.length === 0) {
        setError('No repair guides found. Try different keywords or check spelling.');
      }

    } catch (error) {
      console.error('❌ Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to search. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleSourceToggle = (sourceId: string) => {
    if (sourceId === 'all') {
      setSelectedSources(['all']);
    } else {
      const newSources = selectedSources.includes('all') 
        ? [sourceId]
        : selectedSources.includes(sourceId)
          ? selectedSources.filter(s => s !== sourceId)
          : [...selectedSources.filter(s => s !== 'all'), sourceId];
      
      setSelectedSources(newSources.length === 0 ? ['all'] : newSources);
    }
  };

  const handleHistorySearch = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowFilters(false);
    setError(null);
  };

  const getSourceColor = (sourceName: string) => {
    switch (sourceName.toLowerCase()) {
      case 'ifixit': return '#FF6B35';
      case 'reddit': return '#FF4500';
      case 'youtube': return '#FF0000';
      default: return '#6B7280';
    }
  };

  const popularSearches = [
    'iPhone 14 screen repair',
    'Samsung battery replacement',
    'MacBook keyboard fix',
    'iPad screen replacement',
    'Nintendo Switch Joy-Con drift',
    'Android phone charging port',
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search Repair Guides</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter color="#6B7280" size={20} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color="#6B7280" size={20} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for repair guides..."
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setError(null);
            }}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size={16} />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle color="#DC2626" size={16} strokeWidth={2} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Sources</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.sourceFilters}
          >
            {sources.map((source) => {
              const IconComponent = source.icon;
              const isSelected = selectedSources.includes(source.id);
              
              return (
                <TouchableOpacity
                  key={source.id}
                  style={[
                    styles.sourceChip,
                    isSelected && styles.sourceChipActive
                  ]}
                  onPress={() => handleSourceToggle(source.id)}
                >
                  <IconComponent 
                    color={isSelected ? '#FFFFFF' : '#6B7280'} 
                    size={16} 
                    strokeWidth={2} 
                  />
                  <Text style={[
                    styles.sourceChipText,
                    isSelected && styles.sourceChipTextActive
                  ]}>
                    {source.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Results Status */}
        {results.length > 0 && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Found {results.length} results {cached && '(cached)'}
            </Text>
          </View>
        )}

        {/* Search Results */}
        {results.length > 0 ? (
          <View style={styles.resultsContainer}>
            {results.map((result, index) => (
              <TouchableOpacity
                key={`${result.source_name}-${index}`}
                style={styles.resultCard}
                onPress={() => handleOpenLink(result.source_url)}
                activeOpacity={0.7}
              >
                <View style={styles.resultContent}>
                  {result.image_url && (
                    <Image 
                      source={{ uri: result.image_url }}
                      style={styles.resultImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.resultText}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {result.title}
                      </Text>
                      <View style={[
                        styles.sourceBadge,
                        { backgroundColor: getSourceColor(result.source_name) }
                      ]}>
                        <Text style={styles.sourceBadgeText}>
                          {result.source_name}
                        </Text>
                      </View>
                    </View>
                    {result.description && (
                      <Text style={styles.resultDescription} numberOfLines={2}>
                        {result.description}
                      </Text>
                    )}
                    <View style={styles.resultFooter}>
                      <ExternalLink color="#6B7280" size={14} strokeWidth={2} />
                      <Text style={styles.openText}>Open Guide</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : !loading && query.length > 0 && !error ? (
          <View style={styles.emptyContainer}>
            <Search color="#9CA3AF" size={48} strokeWidth={2} />
            <Text style={styles.emptyTitle}>No guides found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different keyword or check your spelling
            </Text>
          </View>
        ) : (
          <View style={styles.defaultContent}>
            {/* Popular Searches */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Searches</Text>
              <View style={styles.popularSearches}>
                {popularSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.popularSearchChip}
                    onPress={() => handleHistorySearch(search)}
                  >
                    <Text style={styles.popularSearchText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                {searchHistory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => handleHistorySearch(item.query)}
                  >
                    <Clock color="#6B7280" size={16} strokeWidth={2} />
                    <Text style={styles.historyQuery}>{item.query}</Text>
                    <Text style={styles.historyCount}>
                      {item.results_count} results
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Debug Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How to Use</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  • Type keywords like "iPhone screen repair" or "Samsung battery"
                </Text>
                <Text style={styles.infoText}>
                  • Use the filter button to search specific sources
                </Text>
                <Text style={styles.infoText}>
                  • Tap any result to open the full repair guide
                </Text>
                <Text style={styles.infoText}>
                  • Results are cached for 24 hours for faster loading
                </Text>
              </View>
            </View>
          </View>
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  searchButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sourceFilters: {
    flexDirection: 'row',
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sourceChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  sourceChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  sourceChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  resultsContainer: {
    paddingHorizontal: 20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultContent: {
    flexDirection: 'row',
    padding: 16,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#F3F4F6',
  },
  resultText: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
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
  },
  defaultContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  popularSearches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularSearchChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  popularSearchText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyQuery: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginLeft: 12,
  },
  historyCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
});