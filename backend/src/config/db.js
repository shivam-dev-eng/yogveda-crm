'use strict';

require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is missing in .env file');
    }
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected to Supabase');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed!');
    console.error('Reason:', error.message);
    if (error.code) console.error('Error Code:', error.code);

    process.exit(1);
  }
};

const query = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

// Helper for Transactions in PostgreSQL
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  connectDB,
  withTransaction
};
