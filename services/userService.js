const { query } = require('./db');
const { AppError } = require('../utils/AppError');

async function updateProfile(userId, changes) {
  const fields = [];
  const params = [];
  const mapping = {
    email: 'email',
    phone: 'phone',
    avatarUrl: 'avatar_url',
    bio: 'bio',
  };
  for (const [key, column] of Object.entries(mapping)) {
    if (changes[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(changes[key]);
    }
  }
  if (!fields.length) throw new AppError(400, 'NO_CHANGES', '没有需要修改的资料');
  params.push(userId);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`, params);
  const users = await query(
    `SELECT user_id, username, email, phone, avatar_url, bio, created_at, updated_at
     FROM users WHERE user_id = ?`,
    [userId],
  );
  return users[0];
}

async function getPublicProfile(userId) {
  const users = await query(
    `SELECT u.user_id, u.username, u.avatar_url, u.bio, u.created_at,
            COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.skill_id END) AS skill_count,
            COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.exchange_id END) AS completed_exchange_count,
            COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
            COUNT(DISTINCT r.review_id) AS review_count
     FROM users u
     LEFT JOIN skills s ON s.user_id = u.user_id
     LEFT JOIN exchanges e ON e.applicant_id = u.user_id OR e.target_user_id = u.user_id
     LEFT JOIN reviews r ON r.to_user_id = u.user_id
     WHERE u.user_id = ? AND u.status = 'active'
     GROUP BY u.user_id`,
    [userId],
  );
  if (!users.length) throw new AppError(404, 'USER_NOT_FOUND', '用户不存在');
  return users[0];
}

async function getUserReviews(userId) {
  await getPublicProfile(userId);
  return query(
    `SELECT r.review_id, r.exchange_id, r.rating, r.content, r.created_at,
            r.skill_id, s.title AS skill_title,
            r.from_user_id, u.username AS from_username, u.avatar_url AS from_avatar_url
     FROM reviews r
     JOIN skills s ON s.skill_id = r.skill_id
     JOIN users u ON u.user_id = r.from_user_id
     WHERE r.to_user_id = ?
     ORDER BY r.created_at DESC`,
    [userId],
  );
}

module.exports = { updateProfile, getPublicProfile, getUserReviews };
