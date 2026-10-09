const { query, transaction } = require('./db');
const { AppError } = require('../utils/AppError');

async function createReview(userId, payload) {
  return transaction(async (connection) => {
    const [rows] = await connection.execute('SELECT * FROM exchanges WHERE exchange_id = ? FOR UPDATE', [payload.exchangeId]);
    if (!rows.length) throw new AppError(404, 'EXCHANGE_NOT_FOUND', '交换申请不存在');
    const exchange = rows[0];
    if (exchange.status !== 'completed') {
      throw new AppError(409, 'EXCHANGE_NOT_COMPLETED', '交换完成后才能评价');
    }
    const isApplicant = Number(exchange.applicant_id) === userId;
    const isTarget = Number(exchange.target_user_id) === userId;
    if (!isApplicant && !isTarget) throw new AppError(403, 'FORBIDDEN', '你不是该交换的参与者');

    const toUserId = isApplicant ? exchange.target_user_id : exchange.applicant_id;
    const skillId = isApplicant ? exchange.request_skill_id : exchange.offer_skill_id;
    const [result] = await connection.execute(
      `INSERT INTO reviews (exchange_id, from_user_id, to_user_id, skill_id, rating, content)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [payload.exchangeId, userId, toUserId, skillId, payload.rating, payload.content],
    );
    await connection.execute(
      `INSERT INTO notifications (user_id, type, content, related_exchange_id)
       VALUES (?, 'review_received', '你收到了一条新的技能交换评价。', ?)`,
      [toUserId, payload.exchangeId],
    );
    const [reviews] = await connection.execute(
      `SELECT r.review_id, r.exchange_id, r.from_user_id, r.to_user_id,
              r.skill_id, s.title AS skill_title, r.rating, r.content, r.created_at
       FROM reviews r JOIN skills s ON s.skill_id = r.skill_id
       WHERE r.review_id = ?`,
      [result.insertId],
    );
    return reviews[0];
  });
}

async function listMine(userId) {
  return query(
    `SELECT r.review_id, r.exchange_id, r.from_user_id, from_user.username AS from_username,
            r.to_user_id, to_user.username AS to_username,
            r.skill_id, s.title AS skill_title, r.rating, r.content, r.created_at,
            CASE WHEN r.from_user_id = ? THEN 'sent' ELSE 'received' END AS direction
     FROM reviews r
     JOIN users from_user ON from_user.user_id = r.from_user_id
     JOIN users to_user ON to_user.user_id = r.to_user_id
     JOIN skills s ON s.skill_id = r.skill_id
     WHERE r.from_user_id = ? OR r.to_user_id = ?
     ORDER BY r.created_at DESC`,
    [userId, userId, userId],
  );
}

module.exports = { createReview, listMine };
