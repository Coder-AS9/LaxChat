import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration:');
console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'UNDEFINED');
console.log('  Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'UNDEFINED');

// Check if environment variables are missing
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase environment variables are not configured.');
  console.warn('The app will run in demo mode with limited functionality.');
  console.warn('To enable full functionality, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Create a mock client for when Supabase is not configured
// This allows the app to run without crashing
let supabase: SupabaseClient;

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created successfully');
} else {
  // Create a dummy client that will fail gracefully
  // Use placeholder values to avoid immediate errors
  supabase = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  console.warn('⚠️ Using placeholder Supabase client - database operations will fail');
}

export { supabase };
