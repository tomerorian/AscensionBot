import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rthkuqkvbjozjzoabvfh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY; // Ensure this is set in your environment variables

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;