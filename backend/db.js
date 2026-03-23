import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        hash VARCHAR(100),
        status VARCHAR(50) NOT NULL,
        confidence INTEGER NOT NULL,
        is_malicious BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL, -- CRITICAL, WARNING, INFO
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
};

initDB();

export default pool;
