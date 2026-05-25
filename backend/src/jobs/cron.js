'use strict';
const cron  = require('node-cron');
const { pool } = require('../config/db');

// Every hour — mark pending follow-ups as missed if overdue by 1+ hour
cron.schedule('0 * * * *', async () => {
  try {
    const r = await pool.query(`
      UPDATE follow_ups SET status='missed'
      WHERE status='pending' AND scheduled_at < NOW() - INTERVAL '1 hour'
    `);
    if (r.rowCount) console.log(`[CRON] Marked ${r.rowCount} follow-ups as missed`);
  } catch (e) { console.error('[CRON] followup job error:', e.message); }
});

// Daily 8:00 AM IST (2:30 UTC) — log overdue summary
cron.schedule('30 2 * * *', async () => {
  try {
    const res = await pool.query(`
      SELECT COUNT(*) AS cnt FROM leads WHERE status='follow_up' AND next_followup_at < CURRENT_DATE
    `);
    console.log(`[CRON] Daily summary — ${res.rows[0].cnt} overdue follow-ups`);
  } catch (e) { console.error('[CRON] daily summary error:', e.message); }
});

console.log('✅  Cron jobs registered');
