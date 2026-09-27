import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ossureoiyfvurmiesosm.supabase.co';
const supabaseAnonKey = 'sb_publishable_BqM07I6vLWO4Nw14LouTWg_uY6m63';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);