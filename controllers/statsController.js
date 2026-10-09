const statsService = require('../services/statsService');
const { success } = require('../utils/response');

async function mine(req, res) {
  success(res, await statsService.getDashboardStats(req.user.user_id), '获取个人统计成功');
}

module.exports = { mine };
