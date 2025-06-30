import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Custom storage adapter for web and native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Enhanced database types with iFixit integration
export interface RepairGuide {
  id: number;
  created_at: string;
  title: string;
  category: string;
  subcategory_id?: string;
  device_name?: string;
  source_url?: string;
  summary?: string;
  introduction?: string;
  introduction_rendered?: string;
  conclusion?: string;
  conclusion_rendered?: string;
  cover_image_url?: string;
  time_required?: string;
  steps: any;
  'estimated time': string;
  difficulty: string;
  steps_count: number;
  image_url?: string;
  // iFixit specific fields
  author_id?: number;
  author_username?: string;
  ifixit_guide_id?: number;
  is_public?: boolean;
  subject?: string;
  topic?: string;
}

export interface UserRepairProgress {
  id: number;
  created_at: string;
  user_id: string;
  repair_id: number;
  status: string;
  current_step: number;
  progress: number;
  completed_date?: string;
  repair_guides?: RepairGuide;
}

export interface Achievement {
  id: number;
  created_at: string;
  title: string;
  discription: string;
}

export interface UserAchievement {
  id: number;
  created_at: string;
  user_id: string;
  achievement_id: number;
  earned: boolean;
  achievements?: Achievement;
}

export interface RepairStep {
  id: number;
  created_at: string;
  guide_id: number;
  step_number: number;
  instruction: string;
  'image-url'?: string;
  // Enhanced step fields
  title?: string;
  title_rendered?: string;
  text_raw?: string;
  text_rendered?: string;
  ifixit_step_id?: number;
  media_type?: string;
}

export interface Category {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  icon_name?: string;
  description?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

// New search-related types
export interface WebSearchResult {
  id: string;
  created_at: string;
  query: string;
  title: string;
  source_url: string;
  image_url?: string;
  source_name: string;
  description?: string;
  relevance_score: number;
  cached_until: string;
}

export interface UserSearchHistory {
  id: string;
  created_at: string;
  user_id: string;
  query: string;
  results_count: number;
}