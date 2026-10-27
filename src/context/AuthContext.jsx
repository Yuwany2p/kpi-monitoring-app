import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getProfile } from '../services/supabaseService';
import { getInitials } from '../lib/formatters';

const AuthContext = createContext(null);

/**
 * Autentikasi memakai Supabase Auth. Role & tim diambil dari tabel
 * profiles (bukan dari input pengguna), dan hak akses data dijaga RLS.
 */
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileError, setProfileError] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const data = await getProfile(userId);
      if (!data?.is_active) throw new Error('Akun Anda tidak aktif. Hubungi administrator.');
      setProfile({ ...data, team_name: data.teams?.name || null, initials: getInitials(data.full_name) });
      setProfileError(null);
    } catch (err) {
      setProfile(null);
      setProfileError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Jangan await di dalam callback (rekomendasi supabase-js)
        setTimeout(() => loadProfile(newSession?.user?.id), 0);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const message =
        error.message === 'Invalid login credentials'
          ? 'Email atau kata sandi salah.'
          : error.message;
      return { success: false, error: message };
    }
    setSession(data.session);
    await loadProfile(data.user.id);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return error ? { success: false, error: error.message } : { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        currentUser: profile,
        role: profile?.role || null,
        isAuthenticated: Boolean(session && profile),
        loading,
        profileError,
        login,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
