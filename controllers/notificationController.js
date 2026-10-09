const notificationService = require('../services/notificationService');
const { success } = require('../utils/response');
const validator = require('../utils/validator');

async function list(req, res) {
  success(res, await notificationService.listNotifications(req.user.user_id), '获取通知成功');
}

async function markRead(req, res) {
  const notificationId = validator.integer(req.params.id, '通知编号');
  success(res, await notificationService.markRead(notificationId, req.user.user_id), '通知已标记为已读');
}

async function markAllRead(req, res) {
  success(res, await notificationService.markAllRead(req.user.user_id), '全部通知已读');
}

module.exports = { list, markRead, markAllRead };
