import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER,
    host: 'localhost',
    database: 'albion',
    password: process.env.DB_PASSWORD,
    port: 5432,
});

export default pool;
