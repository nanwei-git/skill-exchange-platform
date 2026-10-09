const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('./db');
const { AppError } = require('../utils/AppError');

const publicColumns = `
  user_id, username, email, phone, avatar_url, bio, created_at, updated_at
`;

function createToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 未配置');
  return jwt.sign(
    { sub: String(userId) },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
}

async function register(payload) {
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const result = await query(
    `INSERT INTO users (username, password_hash, email, phone, avatar_url, bio)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.username,
      passwordHash,
      payload.email,
      payload.phone,
      payload.avatarUrl,
      payload.bio,
    ],
  );
  const users = await query(`SELECT ${publicColumns} FROM users WHERE user_id = ?`, [result.insertId]);
  return { user: users[0], token: createToken(result.insertId) };
}

async function login(username, password) {
  const users = await query(
    `SELECT user_id, username, password_hash, email, phone, avatar_url, bio, created_at, updated_at
     FROM users WHERE username = ? AND status = 'active'`,
    [username],
  );
  if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  }
  const { password_hash: _passwordHash, ...user } = users[0];
  return { user, token: createToken(user.user_id) };
}

async function getCurrentUser(userId) {
  const users = await query(`SELECT ${publicColumns} FROM users WHERE user_id = ?`, [userId]);
  if (!users.length) throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
  return users[0];
}

module.exports = { register, login, getCurrentUser };
