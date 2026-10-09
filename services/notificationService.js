const { query } = require('./db');
const { AppError } = require('../utils/AppError');

async function listNotifications(userId) {
  const items = await query(
    `SELECT notification_id, type, content, related_exchange_id, is_read, created_at
     FROM notifications WHERE user_id = ?
     ORDER BY created_at DESC, notification_id DESC`,
    [userId],
  );
  const unread = items.filter((item) => !item.is_read).length;
  return { items, unread };
}

async function markRead(notificationId, userId) {
  const result = await query(
    'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
    [notificationId, userId],
  );
  if (!result.affectedRows) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', '通知不存在');
  const rows = await query(
    `SELECT notification_id, type, content, related_exchange_id, is_read, created_at
     FROM notifications WHERE notification_id = ?`,
    [notificationId],
  );
  return rows[0];
}

async function markAllRead(userId) {
  const result = await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  return { updated: result.affectedRows };
}

module.exports = { listNotifications, markRead, markAllRead };
