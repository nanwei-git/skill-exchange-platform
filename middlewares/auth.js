const jwt = require('jsonwebtoken');
const { query } = require('../services/db');
const { AppError } = require('../utils/AppError');

async function requireAuth(req, _res, next) {
  try {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_REQUIRED', '请先登录');
    }

    const token = authorization.slice(7).trim();
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET 未配置');

    const payload = jwt.verify(token, secret);
    const users = await query(
      'SELECT user_id, username, email, avatar_url FROM users WHERE user_id = ? AND status = ?',
      [payload.sub, 'active'],
    );
    if (!users.length) throw new AppError(401, 'INVALID_TOKEN', '登录状态已失效');

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError(401, 'TOKEN_EXPIRED', '登录已过期，请重新登录'));
      return;
    }
    if (error.name === 'JsonWebTokenError') {
      next(new AppError(401, 'INVALID_TOKEN', '登录凭证无效'));
      return;
    }
    next(error);
  }
}

module.exports = { requireAuth };
