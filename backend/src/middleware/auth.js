'use strict';
const jwt   = require('jsonwebtoken');
const { query } = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'Not authenticated.' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[AUTH DEBUG]: Verifying token for User ID: ${decoded.id}`);
    
    const [user]  = await query('SELECT id,name,email,phone,role,is_active,incentive_rate FROM users WHERE id=$1', [decoded.id]);

    if (!user) {
      console.error(`[AUTH ERROR]: User ID ${decoded.id} not found in Database.`);
      return res.status(401).json({ success: false, message: 'Session invalid. Please login again.' });
    }
    // console.log(`[AUTH SUCCESS]: User ${user.email} authenticated.`);

    // PostgreSQL handles booleans strictly, but let's be robust
    if (!user.is_active || user.is_active === 'false' || user.is_active === 0) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH ERROR]: JWT Verification failed for token ->', err.message);
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: `Access denied. Required role: ${roles.join(' or ')}` });
  next();
};

// isAdmin helper
const isAdmin = (user) => ['admin','sub_admin'].includes(user.role);

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { protect, authorize, isAdmin, AppError };
