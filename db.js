import postgres from 'postgres'

const sql = postgres({
    host: 'localhost',
    port: 5432,
    database: 'albion',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Export the sql instance
export default sql;
