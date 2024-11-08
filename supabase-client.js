import { createClient } from '@supabase/supabase-js';

//const supabaseUrl = 'https://rthkuqkvbjozjzoabvfh.supabase.co';
const supabaseUrl = 'http://localhost:5432';
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
        user: process.env.DB_USER,
        host: 'localhost',
        database: 'albion',
        password: process.env.DB_PASSWORD,
        port: 5432,
    }
});

export default supabase;