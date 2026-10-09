const { query } = require('./db');

async function getDashboardStats(userId) {
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM skills WHERE user_id = ? AND status = 'active') AS active_skill_count,
       (SELECT COUNT(*) FROM exchanges WHERE applicant_id = ? OR target_user_id = ?) AS exchange_count,
       (SELECT COUNT(*) FROM exchanges WHERE (applicant_id = ? OR target_user_id = ?) AND status = 'completed') AS completed_exchange_count,
       (SELECT COUNT(*) FROM exchanges WHERE target_user_id = ? AND status = 'pending') AS pending_received_count,
       (SELECT COUNT(*) FROM favorites WHERE user_id = ?) AS favorite_count,
       (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) AS unread_notification_count,
       (SELECT COALESCE(ROUND(AVG(rating), 1), 0) FROM reviews WHERE to_user_id = ?) AS average_rating,
       (SELECT COUNT(*) FROM reviews WHERE to_user_id = ?) AS received_review_count`,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId],
  );
  const categoryStats = await query(
    `SELECT c.name AS category_name, COUNT(*) AS skill_count
     FROM skills s JOIN skill_categories c ON c.category_id = s.category_id
     WHERE s.user_id = ? GROUP BY s.category_id ORDER BY skill_count DESC`,
    [userId],
  );
  return { ...rows[0], categoryStats };
}

module.exports = { getDashboardStats };
