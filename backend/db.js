// backend/db.js
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool using values from .env
// Supports DATABASE_URL or discrete DB_* vars.
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      }
);

// A helper to perform queries with automatic connection handling
export const query = (text, params) => {
  return pool.query(text, params);
};
