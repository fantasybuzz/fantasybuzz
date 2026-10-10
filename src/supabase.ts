import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ossureoiyfvurmiesosm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zc3VyZW9peWZ2dXJtaWVzb3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1Mjk0NDYsImV4cCI6MjEwNjEwNTQ0Nn0.1wbuFWa4drFFL1Q11YLJ4DL7OVZb_j4t8rsYrcNXgRc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);