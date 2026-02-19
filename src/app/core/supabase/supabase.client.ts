import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

const supabaseAnonKey = environment.supabaseAnon ?? environment.supabaseAnonKey;
const authStorage = typeof window !== 'undefined' ? window.sessionStorage : undefined;

export const supabase = createClient(environment.supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage
  }
});
