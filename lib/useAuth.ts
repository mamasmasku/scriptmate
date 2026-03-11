// lib/useAuth.ts — dengan dukungan iframe + postMessage dari auth tab

import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, UserCredits } from './supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitingForAuth, setWaitingForAuth] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const [{ data: profileData }, { data: creditsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_credits').select('*').eq('user_id', userId).single(),
    ]);
    setProfile(profileData);
    setCredits(creditsData);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setCredits(null);
      }
      setWaitingForAuth(false);
    });

    // postMessage listener untuk iframe Blogger
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'AUTH_RESULT' && event.data.success) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
        setWaitingForAuth(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, [fetchProfile]);

  const refreshCredits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_credits').select('*').eq('user_id', user.id).single();
    setCredits(data);
  }, [user]);

  // Buka auth di new tab/popup — untuk iframe Blogger
  const openAuthTab = useCallback((path: '/auth/login' | '/auth/register' = '/auth/login') => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const authWindow = window.open(
      `${appUrl}${path}`,
      'scriptmate_auth',
      'width=480,height=700,scrollbars=yes,resizable=yes,top=80,left=200'
    );
    if (authWindow) {
      setWaitingForAuth(true);
      const timer = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(timer);
          setWaitingForAuth(false);
          // Refresh kalau user tutup popup manual
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              setUser(session.user);
              fetchProfile(session.user.id);
            }
          });
        }
      }, 800);
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCredits(null);
  }, []);

  return { user, profile, credits, loading, waitingForAuth, refreshCredits, openAuthTab, signOut };
}
