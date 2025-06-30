import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: any;

    const setupAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Listen for auth changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email || 'no user');
            
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // Handle different auth events
            switch (event) {
              case 'SIGNED_OUT':
                console.log('User signed out, redirecting to login');
                // Clear user state immediately
                setUser(null);
                setSession(null);
                // Use replace to prevent going back to authenticated screens
                router.replace('/(auth)/login');
                break;
                
              case 'SIGNED_IN':
                if (session?.user) {
                  console.log('User signed in, redirecting to main app');
                  router.replace('/(tabs)');
                }
                break;
                
              case 'TOKEN_REFRESHED':
                console.log('Token refreshed');
                break;
                
              default:
                console.log('Other auth event:', event);
            }
          }
        );

        subscription = authSubscription;
      } catch (error) {
        console.error('Error setting up auth:', error);
        setLoading(false);
      }
    };

    setupAuth();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Call Supabase sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase sign out error:', error);
        throw error;
      }
      
      console.log('Successfully signed out from Supabase');
      
      // The auth state change listener will handle the state updates and redirect
    } catch (error) {
      console.error('Error in signOut function:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};