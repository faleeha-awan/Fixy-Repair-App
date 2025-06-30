import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side Supabase client without React Native dependencies
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database types (same as client-side)
export interface RepairGuide {
  id: number;
  created_at: string;
  title: string;
  category: string;
  steps: any;
  'estimated time': string;
  difficulty: string;
  steps_count: number;
  image_url?: string;
}

export interface RepairStep {
  id: number;
  created_at: string;
  guide_id: number;
  step_number: number;
  instruction: string;
  'image-url'?: string;
}