import pool from './db.js';

const fixDb = async () => {
  try {
    // Convert to TIMESTAMPTZ so pg driver correctly understands it's UTC from Neon
    await pool.query('ALTER TABLE activities ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'');
    await pool.query('ALTER TABLE scans ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'');
    console.log('Successfully fixed database timezone issues!');
  } catch (err) {
    console.error('Error fixing DB:', err);
  } finally {
    process.exit(0);
  }
};

fixDb();
