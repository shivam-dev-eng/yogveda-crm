'use strict';
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { query, connectDB, pool } = require('./config/db');

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://yogveda-crm-hkat.vercel.app',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// ── Rate limits ────────────────────────────────────────────────
app.use('/api/',          rateLimit({ windowMs: 15*60*1000, max: 300 }));
app.use('/api/auth/login',rateLimit({ windowMs: 15*60*1000, max: 20  }));
app.use('/api/webhooks/', rateLimit({ windowMs:    60*1000, max: 120 }));

// ── Health ─────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Yogveda CRM API Running"
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// Handle Favicon 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ── Database Connection Tests ──────────────────────────────────

// Test 1: PostgreSQL Main Query
app.get('/db-test', async (req, res) => {
  try {
    const rows = await query('SELECT NOW() AS time');
    res.json({
      success: true,
      message: "PostgreSQL Main Connected",
      data: rows[0]
    });
  } catch (error) {
    console.error('DB ERROR:', error);
    res.status(500).json({
      success: false,
      source: "PostgreSQL",
      error: error.message
    });
  }
});

// Test 2: PostgreSQL (Supabase DB)
app.get('/supa-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS time');
    res.json({
      success: true,
      message: "Supabase PostgreSQL Connected",
      data: result.rows[0]
    });
  } catch (error) {
    console.error('SUPABASE ERROR:', error);
    res.status(500).json({
      success: false,
      source: "PostgreSQL",
      error: error.message
    });
  }
});

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',         require('./modules/auth/auth.routes'));
app.use('/api/leads',        require('./modules/leads/followup.routes'));
app.use('/api/leads',        require('./modules/leads/leads.routes'));
app.use('/api/customers',    require('./modules/customers/customers.routes'));
app.use('/api/orders',       require('./modules/orders/orders.routes'));
app.use('/api/team',         require('./modules/team/team.routes'));
app.use('/api/dashboard',    require('./modules/reports/dashboard.routes'));
app.use('/api/reports',      require('./modules/reports/reports.routes'));
app.use('/api/webhooks',     require('./modules/integrations/webhook.routes'));
app.use('/api/integrations', require('./modules/integrations/settings.routes'));

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.path} not found` })
);

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}`, err.message);

  // Handle PostgreSQL Unique Violation (23505)
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Record already exists.' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    const field = (err.sqlMessage.match(/key '(.+?)'/) || [])[1] || 'field';
    return res.status(409).json({ success: false, message: `${field} already exists.` });
  }
  const code = err.statusCode || 500;
  res.status(code).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && code === 500
      ? 'Internal server error' : err.message
  });
});

// ── Boot ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  require('./jobs/cron');                   // start cron jobs
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`🚀  Yogveda CRM API → http://localhost:${PORT}`)
  );
});

module.exports = app;
