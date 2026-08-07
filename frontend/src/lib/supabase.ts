import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const getNetworkErrorMessage = (err: any, fallbackMessage: string): string => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No network connection. Please check your internet and try again.';
  }

  const message = err?.message ?? '';
  const normalizedMessage = String(message).toLowerCase();

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('network request failed') ||
    normalizedMessage.includes('fetch failed')
  ) {
    return 'No network connection. Please check your internet and try again.';
  }

  return String(message) || fallbackMessage;
};
