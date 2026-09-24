import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Configuration:');
console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'UNDEFINED');
console.log('  Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'UNDEFINED');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!');
  console.error('  VITE_SUPABASE_URL:', supabaseUrl);
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '[SET]' : 'UNDEFINED');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

if (supabaseUrl.includes('undefined') || supabaseUrl === '') {
  console.error('❌ CRITICAL: Supabase URL is invalid:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client created successfully');
