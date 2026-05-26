'use strict';
const express  = require('express');
const ExcelJS  = require('exceljs');
const { Parser } = require('json2csv');
const { query } = require('../../config/db');
const { protect, authorize, isAdmin, AppError } = require('../../middleware/auth');

// ================================================================
// ORDERS
// ================================================================
const ordersRouter = express.Router();
ordersRouter.use(protect);

ordersRouter.get('/', async (req, res, next) => {
  try {
    let where='TRUE'; const p=[];
    if(!isAdmin(req.user)){ p.push(req.user.id); where+=` AND o.assigned_to=$${p.length}`; }
    if(req.query.status){ p.push(req.query.status); where+=` AND o.status=$${p.length}`; }
    if(req.query.is_repeat){ p.push(req.query.is_repeat==='true'); where+=` AND o.is_repeat=$${p.length}`; }
    
    const countRows = await query(`SELECT COUNT(*) AS total FROM orders o WHERE ${where}`, p);
    const total = parseInt(countRows[0]?.total || 0);

    const limitIdx = p.length + 1;
    const offsetIdx = p.length + 2;
    const orders = await query(`SELECT o.*,l.name AS lead_name,l.phone AS lead_phone,
      c.name AS customer_name,u.name AS agent_name
      FROM orders o LEFT JOIN leads l ON l.id=o.lead_id
      LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN users u ON u.id=o.assigned_to
      WHERE ${where} ORDER BY o.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...p, Number(req.query.limit||25), (Number(req.query.page||1)-1)*Number(req.query.limit||25)]);
    res.json({ success:true, total, orders });
  } catch(err){ next(err); }
});

ordersRouter.patch('/:id/tracking', async (req, res, next) => {
  try {
    const { tracking_id, courier, delivery_date } = req.body;
    await query('UPDATE orders SET tracking_id=$1, courier=$2, delivery_date=$3, status=$4, revenue_countable=$5 WHERE id=$6',
      [tracking_id||null,courier||null,delivery_date||null,
       delivery_date?'delivered':'dispatched',delivery_date?1:0,req.params.id]);
    const [order] = await query('SELECT * FROM orders WHERE id=$1',[req.params.id]);
    res.json({ success:true, order });
  } catch(err){ next(err); }
});

// ================================================================
// TEAM
// ================================================================
const teamRouter = express.Router();
teamRouter.use(protect, authorize('admin','sub_admin'));

teamRouter.get('/round-robin', async (req, res, next) => {
  try {
    const status = await query(`
      SELECT rr.*, u.name AS last_user_name,
        COUNT(uc.user_id) AS total_members,
        COUNT(u2.id) FILTER (WHERE u2.is_active = TRUE) AS active_members
      FROM round_robin rr
      LEFT JOIN users u ON u.id=rr.last_user_id
      LEFT JOIN user_categories uc ON uc.category=rr.category
      LEFT JOIN users u2 ON u2.id=uc.user_id AND u2.is_active=TRUE
      GROUP BY rr.id, rr.category, rr.current_index, rr.last_user_id, rr.updated_at, u.name
      ORDER BY rr.category
    `);
    res.json({ success:true, status });
  } catch(err){ next(err); }
});

teamRouter.post('/assign-category', async (req, res, next) => {
  try {
    const { user_id, category } = req.body;
    await query('INSERT INTO user_categories (user_id,category) VALUES ($1,$2) ON CONFLICT DO NOTHING',[user_id,category]);
    await query('INSERT INTO round_robin (category,current_index) VALUES ($1,0) ON CONFLICT (category) DO NOTHING',[category]);
    res.json({ success:true, message:`User added to ${category} pool` });
  } catch(err){ next(err); }
});

teamRouter.delete('/assign-category', async (req, res, next) => {
  try {
    const { user_id, category } = req.body;
    await query('DELETE FROM user_categories WHERE user_id=$1 AND category=$2',[user_id,category]);
    res.json({ success:true });
  } catch(err){ next(err); }
});

teamRouter.patch('/reset-index/:category', authorize('admin'), async (req, res, next) => {
  try {
    await query('UPDATE round_robin SET current_index=0 WHERE category=$1',[req.params.category]);
    res.json({ success:true, message:'Round-robin index reset.' });
  } catch(err){ next(err); }
});

// ================================================================
// DASHBOARD
// ================================================================
const dashRouter = express.Router();
dashRouter.use(protect);

dashRouter.get('/admin', authorize('admin','sub_admin'), async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const dateWhere = start_date ? `AND created_at BETWEEN '${start_date} 00:00:00' AND '${end_date||new Date().toISOString().split('T')[0]} 23:59:59'` : 'AND TRUE';

    const [kpis,repCnt,monthlyRev,byStatus,bySource,userPerf,fuCounts] = await Promise.all([
      query(`SELECT status,COUNT(*) AS cnt,SUM(CASE WHEN revenue_countable=TRUE THEN COALESCE(order_amount,0) ELSE 0 END) AS revenue FROM leads WHERE TRUE ${dateWhere} GROUP BY status`),
      query(`SELECT COUNT(*) AS c FROM leads WHERE is_repeat=TRUE ${dateWhere}`),
      query(`SELECT EXTRACT(YEAR FROM delivery_date) AS yr, EXTRACT(MONTH FROM delivery_date) AS mo, SUM(amount) AS revenue, COUNT(*) AS orders FROM orders WHERE revenue_countable=TRUE AND delivery_date >= NOW() - INTERVAL '12 months' GROUP BY yr, mo ORDER BY yr, mo`),
      query(`SELECT status,COUNT(*) AS cnt FROM leads WHERE TRUE ${dateWhere} GROUP BY status`),
      query(`SELECT source,COUNT(*) AS cnt FROM leads WHERE TRUE ${dateWhere} GROUP BY source`),
      query(`SELECT u.id,u.name,COUNT(l.id) AS total_leads,
        COUNT(l.id) FILTER (WHERE l.status IN ('converted','delivered')) AS converted,
        COUNT(l.id) FILTER (WHERE l.status='delivered') AS delivered,
        SUM(CASE WHEN l.revenue_countable=TRUE THEN COALESCE(l.order_amount,0) ELSE 0 END) AS revenue
        FROM users u LEFT JOIN leads l ON l.assigned_to=u.id ${dateWhere?'AND '+dateWhere.slice(4):''}
        WHERE u.role='sales' GROUP BY u.id,u.name ORDER BY revenue DESC`),
      (async()=>{
        const n=new Date(); const s=new Date(n); s.setHours(0,0,0,0); const e=new Date(n); e.setHours(23,59,59,999);
        const [[ov],[td],[up]] = await Promise.all([
          query(`SELECT COUNT(*) AS c FROM leads WHERE status='follow_up' AND next_followup_at < $1`,[s]),
          query(`SELECT COUNT(*) AS c FROM leads WHERE status='follow_up' AND next_followup_at BETWEEN $1 AND $2`,[s,e]),
          query(`SELECT COUNT(*) AS c FROM leads WHERE status='follow_up' AND next_followup_at > $1`,[e]),
        ]);
        return {overdue:Number(ov.c),today:Number(td.c),upcoming:Number(up.c)};
      })()
    ]);

    const cards={total:0,new:0,in_process:0,follow_up:0,converted:0,delivered:0,closed_lost:0,repeat_orders:Number(repCnt[0].c||0),total_revenue:0};
    kpis.forEach(k=>{cards[k.status]=Number(k.cnt);cards.total+=Number(k.cnt);cards.total_revenue+=Number(k.revenue||0);});
    const userPerfWithRate=userPerf.map(u=>({...u,conversionRate:u.total_leads>0?+(u.converted/u.total_leads*100).toFixed(1):0}));

    res.json({ success:true, cards, monthlyRevenue:monthlyRev, byStatus, bySource, userPerformance:userPerfWithRate, followUpCounts:fuCounts });
  } catch(err){ next(err); }
});

dashRouter.get('/user', async (req, res, next) => {
  try {
    const uid=req.user.id;
    const [kpis,monthly,byStatus,incSummary] = await Promise.all([
      query(`SELECT status,COUNT(*) AS cnt,SUM(CASE WHEN revenue_countable=TRUE THEN COALESCE(order_amount,0) ELSE 0 END) AS revenue FROM leads WHERE assigned_to=$1 GROUP BY status`,[uid]),
      query(`SELECT EXTRACT(YEAR FROM delivery_date) AS yr, EXTRACT(MONTH FROM delivery_date) AS mo, SUM(amount) AS revenue, COUNT(*) AS orders FROM orders WHERE assigned_to=$1 AND revenue_countable=TRUE AND delivery_date >= NOW() - INTERVAL '6 months' GROUP BY yr, mo ORDER BY yr, mo`,[uid]),
      query(`SELECT status,COUNT(*) AS cnt FROM leads WHERE assigned_to=$1 GROUP BY status`,[uid]),
      query(`SELECT status,SUM(incentive_amount) AS total,COUNT(*) AS cnt FROM incentives WHERE user_id=$1 GROUP BY status`,[uid]),
    ]);
    const cards={assigned:0,converted:0,delivered:0,pending:0,total_revenue:0,total: 0,in_process: 0, follow_up: 0,};
    kpis.forEach(k=>{cards.assigned+=Number(k.cnt);cards.total    += Number(k.cnt); cards.total_revenue+=Number(k.revenue||0);if(['converted','delivered'].includes(k.status))cards.converted+=Number(k.cnt);if(['new','in_process','follow_up'].includes(k.status))cards.pending+=Number(k.cnt);if(k.status==='delivered')cards.delivered=Number(k.cnt);
      if (k.status === 'in_process') cards.in_process  = Number(k.cnt);  // ← YE
      if (k.status === 'follow_up')  cards.follow_up   = Number(k.cnt);  // ← YE
      if (k.status === 'new')        cards.new          = Number(k.cnt);  // ← YE
    });
    const inc={pending:0,approved:0,paid:0};
    incSummary.forEach(i=>{inc[i.status]=Number(i.total||0);});

    const n=new Date();const s=new Date(n);s.setHours(0,0,0,0);const e=new Date(n);e.setHours(23,59,59,999);
    const [[ov],[td],[up]] = await Promise.all([
      query(`SELECT COUNT(*) AS c FROM leads WHERE assigned_to=$1 AND status='follow_up' AND next_followup_at < $2`,[uid,s]),
      query(`SELECT COUNT(*) AS c FROM leads WHERE assigned_to=$1 AND status='follow_up' AND next_followup_at BETWEEN $2 AND $3`,[uid,s,e]),
      query(`SELECT COUNT(*) AS c FROM leads WHERE assigned_to=$1 AND status='follow_up' AND next_followup_at > $2`,[uid,e]),
    ]);
    res.json({ success:true, cards, monthlyGraph:monthly, byStatus, incentiveSummary:inc, followUps:{overdue:Number(ov.c),today:Number(td.c),upcoming:Number(up.c)} });
  } catch(err){ next(err); }
});

// ================================================================
// REPORTS
// ================================================================
const repRouter = express.Router();
repRouter.use(protect);

const buildWhere=(q,user)=>{
  let w='TRUE';const p=[];
  if(user.role==='sales'){ p.push(user.id); w+=` AND l.assigned_to=$${p.length}`; }
  else if(q.assigned_to){ p.push(q.assigned_to); w+=` AND l.assigned_to=$${p.length}`; }
  if(q.status){ p.push(q.status); w+=` AND l.status=$${p.length}`; }
  if(q.source){ p.push(q.source); w+=` AND l.source=$${p.length}`; }
  if(q.campaign_id){ p.push(q.campaign_id); w+=` AND l.campaign_id=$${p.length}`; }
  if(q.start_date){ p.push(q.start_date+' 00:00:00'); w+=` AND l.created_at>=$${p.length}`; }
  if(q.end_date){ p.push(q.end_date+' 23:59:59'); w+=` AND l.created_at<=$${p.length}`; }
  return{w,p};
};

repRouter.get('/revenue', async (req, res, next) => {
  try {
    const { start_date, end_date, assigned_to  } = req.query;

    const effectiveUser = req.user.role === 'sales' ? req.user.id : (assigned_to ? Number(assigned_to) : null);
    const userWhere = effectiveUser ? `AND o.assigned_to = ${effectiveUser}` : '';
    const dateStart = start_date ? `AND o.delivery_date >= '${start_date}'` : '';
    const dateEnd   = end_date   ? `AND o.delivery_date <= '${end_date}'`   : '';

    // const data=await query(`SELECT YEAR(delivery_date) AS yr,MONTH(delivery_date) AS mo,SUM(amount) AS revenue,COUNT(*) AS orders,AVG(amount) AS avg_order FROM orders WHERE revenue_countable=1 ${start_date?`AND delivery_date>='${start_date}'`:''} ${end_date?`AND delivery_date<='${end_date}'`:''} GROUP BY yr,mo ORDER BY yr,mo`);
    // const [summary]=await query(`SELECT SUM(amount) AS total,COUNT(*) AS cnt FROM orders WHERE revenue_countable=1 ${start_date?`AND delivery_date>='${start_date}'`:''} ${end_date?`AND delivery_date<='${end_date}'`:''}`);
    const data = await query(`
      SELECT EXTRACT(YEAR FROM o.delivery_date) AS yr, EXTRACT(MONTH FROM o.delivery_date) AS mo,
             SUM(o.amount) AS revenue, COUNT(*) AS orders, AVG(o.amount) AS avg_order
      FROM orders o
      WHERE o.revenue_countable = TRUE ${dateStart} ${dateEnd} ${userWhere}
      GROUP BY yr, mo ORDER BY yr, mo
    `);
    const [summary] = await query(`
      SELECT SUM(o.amount) AS total, COUNT(*) AS cnt
      FROM orders o
      WHERE o.revenue_countable = TRUE ${dateStart} ${dateEnd} ${userWhere}
    `);
    res.json({ success:true, data, summary });
  } catch(err){ next(err); }
});

repRouter.get('/team-performance', async (req, res, next) => {
  try {
    const assignedTo = req.query.assigned_to ? Number(req.query.assigned_to) : null;
const userFilter = req.user.role === 'sales' 
  ? `AND u.id = ${req.user.id}` 
  : (assignedTo ? `AND u.id = ${assignedTo}` : '');
    const performance=await query(`SELECT u.id,u.name,u.email,
      COUNT(l.id) AS total_leads,
      COUNT(l.id) FILTER (WHERE l.status='new') AS new_cnt,
      COUNT(l.id) FILTER (WHERE l.status='in_process') AS in_process,
      COUNT(l.id) FILTER (WHERE l.status='follow_up') AS follow_up,
      COUNT(l.id) FILTER (WHERE l.status IN ('converted','delivered')) AS converted,
      COUNT(l.id) FILTER (WHERE l.status='delivered') AS delivered,
      COUNT(l.id) FILTER (WHERE l.status='closed_lost') AS closed_lost,
      SUM(CASE WHEN l.revenue_countable=1 THEN COALESCE(l.order_amount,0) ELSE 0 END) AS revenue,
      ROUND(COUNT(l.id) FILTER (WHERE l.status IN ('converted','delivered'))::numeric / NULLIF(COUNT(l.id),0)*100,1) AS conversion_rate
      FROM users u LEFT JOIN leads l ON l.assigned_to=u.id
      WHERE u.role='sales' ${userFilter} GROUP BY u.id,u.name,u.email ORDER BY revenue DESC`);
    res.json({ success:true, performance });
  } catch(err){ next(err); }
});

repRouter.get('/campaign-performance', async (req, res, next) => {
  try {
    const userWhere = req.user.role === 'sales' 
      ? `AND l.assigned_to = ${req.user.id}` 
      : (req.query.assigned_to ? `AND l.assigned_to = ${Number(req.query.assigned_to)}` : '');
    const data=await query(`SELECT c.id,c.name,c.platform,c.status,
      COUNT(l.id) AS total_leads, COUNT(l.id) FILTER (WHERE l.status IN ('converted','delivered')) AS converted,
      SUM(CASE WHEN l.revenue_countable=1 THEN COALESCE(l.order_amount,0) ELSE 0 END) AS revenue,
      ROUND(COUNT(l.id) FILTER (WHERE l.status IN ('converted','delivered'))::numeric / NULLIF(COUNT(l.id),0)*100,1) AS conversion_rate
      FROM campaigns c LEFT JOIN leads l ON l.campaign_id=c.id ${userWhere}
      GROUP BY c.id,c.name,c.platform,c.status ORDER BY revenue DESC`);
    res.json({ success:true, data });
  } catch(err){ next(err); }
});

repRouter.get('/incentives11', async (req, res, next) => {
  try {
    let where=isAdmin(req.user)?'1=1':`i.user_id=${req.user.id}`;
    if(req.query.user_id&&isAdmin(req.user)){where+=` AND i.user_id=${req.query.user_id}`;}
    if(req.query.status){where+=` AND i.status='${req.query.status}'`;}
    const [incentives,summary]=await Promise.all([
      query(`SELECT i.*,u.name AS user_name,u.email AS user_email,l.name AS lead_name,l.phone AS lead_phone,o.product_name FROM incentives i LEFT JOIN users u ON u.id=i.user_id LEFT JOIN leads l ON l.id=i.lead_id LEFT JOIN orders o ON o.id=i.order_id WHERE ${where} ORDER BY i.created_at DESC`),
      query(`SELECT status,SUM(incentive_amount) AS total,COUNT(*) AS cnt FROM incentives WHERE ${where} GROUP BY status`),
    ]);
    res.json({ success:true, incentives, summary });
  } catch(err){ next(err); }
});

repRouter.get('/incentives', async (req, res, next) => {
  try {
    let where  = isAdmin(req.user) ? '1=1' : `i.user_id=${req.user.id}`;
    let where2 = isAdmin(req.user) ? '1=1' : `user_id=${req.user.id}`;

    if(req.query.user_id && isAdmin(req.user)) {
      where  += ` AND i.user_id=${req.query.user_id}`;
      where2 += ` AND user_id=${req.query.user_id}`;
    }
    if(req.query.status) {
      where  += ` AND i.status='${req.query.status}'`;
      where2 += ` AND status='${req.query.status}'`;
    }

    const [incentives, summary] = await Promise.all([
      query(`SELECT i.*,u.name AS user_name,u.email AS user_email,l.name AS lead_name,l.phone AS lead_phone,o.product_name FROM incentives i LEFT JOIN users u ON u.id=i.user_id LEFT JOIN leads l ON l.id=i.lead_id LEFT JOIN orders o ON o.id=i.order_id WHERE ${where} ORDER BY i.created_at DESC`),
      query(`SELECT status,SUM(incentive_amount) AS total,COUNT(*) AS cnt FROM incentives WHERE ${where2} GROUP BY status`),
    ]);
    res.json({ success:true, incentives, summary });
  } catch(err){ next(err); }
});

repRouter.get('/export', async (req, res, next) => {
  try {
    const { format='excel' } = req.query;
    const { w, p } = buildWhere(req.query, req.user);
    const leads = await query(`SELECT l.*,u.name AS assigned_name,c.name AS campaign_name FROM leads l LEFT JOIN users u ON u.id=l.assigned_to LEFT JOIN campaigns c ON c.id=l.campaign_id WHERE ${w} ORDER BY l.created_at DESC`, p);

    const rows = leads.map(l=>({
      Name:l.name, Phone:l.phone, Email:l.email||'', Status:l.status, Source:l.source,
      Category:l.category, 'Assigned To':l.assigned_name||'',
      'Order Amount':l.order_amount||0, 'Tracking ID':l.tracking_id||'',
      'Repeat':l.is_repeat?'Yes':'No', Campaign:l.campaign_name||'',
      'Created':new Date(l.created_at).toLocaleDateString('en-IN'),
      'Follow-up':l.next_followup_at?new Date(l.next_followup_at).toLocaleDateString('en-IN'):'',
    }));

    if(format==='csv'){
      const parser=new Parser({ fields:Object.keys(rows[0]||{}) });
      res.setHeader('Content-Type','text/csv');
      res.setHeader('Content-Disposition',`attachment; filename="yogveda-leads-${Date.now()}.csv"`);
      return res.send(parser.parse(rows));
    }

    const wb=new ExcelJS.Workbook();
    const ws=wb.addWorksheet('Leads');
    if(rows.length){
      ws.columns=Object.keys(rows[0]).map(k=>({header:k,key:k,width:20}));
      ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
      ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF162B20'}};
      rows.forEach(r=>ws.addRow(r));
      ws.eachRow((row,i)=>{ if(i>1&&i%2===0) row.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5F3'}};}); });
    }
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="yogveda-leads-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch(err){ next(err); }
});

module.exports = { ordersRouter, teamRouter, dashRouter, repRouter };
