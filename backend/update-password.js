'use strict';

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

/**
 * Script to manually update user passwords in PostgreSQL.
 * Run this using: node update-password.js
 */
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to Supabase PostgreSQL.");
    
    const newPassword = 'Admin@123';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPassword, salt);

    console.log(`🔄 Updating password for admin@yogveda.com to hash: ${hash}`);

    // Update Admin Password
    await client.query(
      "UPDATE users SET password = $1 WHERE email = $2",
      [hash, 'admin@yogveda.com']
    );

    console.log("✅ DONE: Passwords updated successfully.");
  } catch (err) {
    console.error("❌ FAILED:", err.message);
  } finally {
    await client.end();
  }
}

run();