'use strict';
const { query, withTransaction } = require('../config/db');

// ================================================================
// ROUND-ROBIN ASSIGNMENT
// Atomic update using MySQL transactions to prevent race conditions
// Refactored for PostgreSQL
// ================================================================
const assignRoundRobin = async (category) => {
  return withTransaction(async (conn) => {
    // Lock the row so concurrent webhook calls don't get same index
    const { rows: rrRows } = await conn.query(
      'SELECT * FROM round_robin WHERE category=$1 FOR UPDATE', [category]
    );

    if (rrRows.length === 0) {
      await conn.query('INSERT INTO round_robin (category,current_index) VALUES ($1,0) ON CONFLICT (category) DO NOTHING', [category]);
      const { rows: retryRows } = await conn.query('SELECT * FROM round_robin WHERE category=$1 FOR UPDATE', [category]);
      if (retryRows.length === 0) return null;
      rrRows.push(retryRows[0]);
    }
    const rrRow = rrRows[0];

    // Get active sales users for this category
    const { rows: usersPool } = await conn.query(`
      SELECT u.id, u.name FROM users u
      INNER JOIN user_categories uc ON uc.user_id = u.id AND uc.category = $1
      WHERE u.is_active = true AND u.role = 'sales'
      ORDER BY u.id
    `, [category]);

    let users = usersPool;

    // Fallback: any active sales user
    if (!users.length) {
      const { rows: allUsers } = await conn.query(
        "SELECT id,name FROM users WHERE is_active=true AND role='sales' ORDER BY id"
      );
      users = allUsers;
    }
    if (!users.length) return null;

    const idx      = rrRow.current_index % users.length;
    const assigned = users[idx];

    await conn.query(
      'UPDATE round_robin SET current_index=current_index+1, last_user_id=$1 WHERE category=$2',
      [assigned.id, category]
    );

    return assigned.id;
  });
};

const assignManual = async (targetUserId) => {
  const [user] = await query('SELECT id,name,is_active FROM users WHERE id=$1', [targetUserId]);
  if (!user || !user.is_active) throw Object.assign(new Error('User not found or inactive.'), { statusCode: 404 });
  return user.id;
};

// ================================================================
// CUSTOMER FINGERPRINT — detect returning customers
// ================================================================
const findCustomerByFingerprint = async (phone, email) => {
  if (!phone && !email) return null;
  const conditions = [];
  const params     = [];
  if (phone) { params.push(phone); conditions.push(`phone=$${params.length}`); }
  if (email) { params.push(email); conditions.push(`email=$${params.length}`); }
  const [cust] = await query(
    `SELECT * FROM customers WHERE ${conditions.join(' OR ')} LIMIT 1`, params
  );
  return cust || null;
};

// ================================================================
// PROCESS DELIVERED — order + customer + incentive in one tx
// ================================================================
const processDelivered = async (lead) => {
  return withTransaction(async (conn) => {
    // 1. Create order
    const orderRes = await conn.query(`
      INSERT INTO orders (lead_id,assigned_to,product_name,amount,tracking_id,
                          status,revenue_countable,delivery_date,source,created_by)
      VALUES ($1,$2,$3,$4,$5,'delivered',1,NOW(),'crm',$6)
      RETURNING id
    `, [lead.id, lead.assigned_to, lead.product_name || lead.category,
        lead.order_amount, lead.tracking_id, lead.assigned_to]);
    const orderId = orderRes.rows[0].id;

    // 2. Find or create customer
    const { rows: customerRows } = await conn.query(
      `SELECT * FROM customers WHERE phone=$1 OR (email IS NOT NULL AND email=$2) LIMIT 1`,
      [lead.phone, lead.email || null]
    );
    const existing = customerRows[0];

    let customerId;
    if (existing) {
      // Returning customer
      await conn.query(`
        UPDATE customers
        SET total_orders    = total_orders + 1,
            total_revenue   = total_revenue + $1,
            lifetime_value  = lifetime_value + $2,
            avg_order_value = (total_revenue + $3) / (total_orders + 1),
            last_purchase   = CURRENT_DATE,
            assigned_to     = $4
        WHERE id = $5
      `, [lead.order_amount, lead.order_amount, lead.order_amount, lead.assigned_to, existing.id]);
      customerId = existing.id;

      // Update lead as repeat
      await conn.query(
        'UPDATE leads SET is_repeat=1, repeat_count=repeat_count+1, linked_customer_id=$1 WHERE id=$2',
        [customerId, lead.id]
      );
      // Update order as repeat
      await conn.query(
        'UPDATE orders SET is_repeat=1, order_index=$1, customer_id=$2 WHERE id=$3',
        [existing.total_orders + 1, customerId, orderId]
      );
    } else {
      // New customer
      const custRes = await conn.query(`
        INSERT INTO customers (name,phone,alt_phone,email,city,state,
                               first_lead_id,assigned_to,total_orders,total_revenue,
                               lifetime_value,avg_order_value,first_purchase,last_purchase,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,$11,CURRENT_DATE,CURRENT_DATE,$12)
        RETURNING id
      `, [lead.name, lead.phone, lead.alt_phone || null, lead.email || null,
          lead.city || null, lead.state || null, lead.id, lead.assigned_to,
          lead.order_amount, lead.order_amount, lead.order_amount, lead.assigned_to]);
      customerId = custRes.rows[0].id;

      await conn.query(
        'UPDATE leads SET linked_customer_id=$1 WHERE id=$2', [customerId, lead.id]
      );
      await conn.query(
        'UPDATE orders SET customer_id=$1 WHERE id=$2', [customerId, orderId]
      );
    }

    // 3. Add to purchases history
    await conn.query(`
      INSERT INTO purchases (customer_id,lead_id,order_id,product_name,amount,
                             tracking_id,order_date,delivery_date,source,status)
      VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,CURRENT_DATE,'crm','delivered')
    `, [customerId, lead.id, orderId, lead.product_name || lead.category,
        lead.order_amount, lead.tracking_id || null]);

    // 4. Generate incentive
    const { rows: agentRows } = await conn.query(
      'SELECT incentive_rate FROM users WHERE id=$1', [lead.assigned_to]
    );
    const agent = agentRows[0];

    if (agent && parseFloat(agent.incentive_rate) > 0) {
      const incAmount = Math.round(parseFloat(lead.order_amount) * parseFloat(agent.incentive_rate) / 100);
      await conn.query(`
        INSERT INTO incentives (user_id,order_id,lead_id,order_amount,rate,incentive_amount)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT DO NOTHING
      `, [lead.assigned_to, orderId, lead.id, lead.order_amount, agent.incentive_rate, incAmount]);
    }

    return { orderId, customerId };
  });
};

module.exports = { assignRoundRobin, assignManual, findCustomerByFingerprint, processDelivered };
