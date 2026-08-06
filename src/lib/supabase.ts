import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://whnngjqpgijavtteqqox.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indobm5nanFwZ2lqYXZ0dGVxcW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMTA0NjYsImV4cCI6MjEwMTU4NjQ2Nn0.P0tXGSeyqUI3G_nVZLLVRNJNM0Z6NFyUxl6HsUaEIaI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
