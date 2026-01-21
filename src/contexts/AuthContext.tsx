import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: UserRow | null;
  customerCompany: string | null;
  loading: boolean;
  hasWriteAccess: boolean;
  isManager: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserRow | null>(null);
  const [customerCompany, setCustomerCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileSubscription: any = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
          setupProfileSubscription(session.user.id);
        }
        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
          setupProfileSubscription(session.user.id);
        } else {
          setUserProfile(null);
          setCustomerCompany(null);
          if (profileSubscription) {
            profileSubscription.unsubscribe();
            profileSubscription = null;
          }
        }
      })();
    });

    const setupProfileSubscription = (authUserId: string) => {
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }

      profileSubscription = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `auth_user_id=eq.${authUserId}`,
          },
          async (payload) => {
            const updatedProfile = payload.new as UserRow;

            if (!updatedProfile.enabled) {
              await supabase.auth.signOut();
              setUser(null);
              setUserProfile(null);
            } else {
              setUserProfile(updatedProfile);
            }
          }
        )
        .subscribe();
    };

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, []);

  const fetchUserProfile = async (authUserId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return;
    }

    if (data && !data.enabled) {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setCustomerCompany(null);
      throw new Error('Your account is pending approval. Please contact an administrator.');
    }

    setUserProfile(data);

    // Fetch customer company name if user has a customer_id
    if (data?.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('customer_company')
        .eq('id', data.customer_id)
        .maybeSingle();

      setCustomerCompany(customerData?.customer_company || null);
    } else {
      setCustomerCompany(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, enabled')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (profile && !profile.enabled) {
        await supabase.auth.signOut();
        throw new Error('Your account is pending approval. Please contact an administrator.');
      }

      if (profile) {
        await supabase.from('activity_logs').insert({
          user_id: profile.id,
          action: 'SIGN_IN',
          details: { email },
        });
      }
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { data: profile, error: profileError } = await supabase.from('users').insert({
        auth_user_id: data.user.id,
        email,
        name,
        role: 'user',
        user_rights: 'read_write',
        enabled: false,
      }).select('id').single();
      if (profileError) throw profileError;

      if (profile) {
        await supabase.from('activity_logs').insert({
          user_id: profile.id,
          action: 'SIGN_UP',
          details: { email, name },
        });
      }
    }
  };

  const signOut = async () => {
    try {
      if (userProfile) {
        await supabase.from('activity_logs').insert({
          user_id: userProfile.id,
          action: 'SIGN_OUT',
          details: { email: userProfile.email },
        });
      }

      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always clear local state, even if Supabase call fails
      setUser(null);
      setUserProfile(null);
      setCustomerCompany(null);
    }
  };

  const hasWriteAccess = userProfile?.user_rights === 'read_write';
  const isManager = userProfile?.role === 'manager';

  return (
    <AuthContext.Provider value={{ user, userProfile, customerCompany, loading, hasWriteAccess, isManager, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
