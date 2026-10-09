const userService = require('../services/userService');
const { success } = require('../utils/response');
const validator = require('../utils/validator');

async function updateProfile(req, res) {
  const changes = {};
  if (Object.hasOwn(req.body, 'email')) changes.email = validator.email(req.body.email);
  if (Object.hasOwn(req.body, 'phone')) changes.phone = validator.text(req.body.phone, 'phone', { required: false, max: 20 });
  if (Object.hasOwn(req.body, 'avatarUrl')) changes.avatarUrl = validator.text(req.body.avatarUrl, 'avatarUrl', { required: false, max: 255 });
  if (Object.hasOwn(req.body, 'bio')) changes.bio = validator.text(req.body.bio, 'bio', { required: false, max: 300 });
  success(res, await userService.updateProfile(req.user.user_id, changes), '个人资料已更新');
}

async function getProfile(req, res) {
  const userId = validator.integer(req.params.id, '用户编号');
  success(res, await userService.getPublicProfile(userId), '获取用户资料成功');
}

async function getReviews(req, res) {
  const userId = validator.integer(req.params.id, '用户编号');
  success(res, await userService.getUserReviews(userId), '获取用户评价成功');
}

module.exports = { updateProfile, getProfile, getReviews };
