const favoriteService = require('../services/favoriteService');
const { success } = require('../utils/response');
const validator = require('../utils/validator');

async function list(req, res) {
  success(res, await favoriteService.listFavorites(req.user.user_id), '获取收藏列表成功');
}

async function add(req, res) {
  const skillId = validator.integer(req.params.skillId, '技能编号');
  success(res, await favoriteService.addFavorite(req.user.user_id, skillId), '收藏操作成功', 201);
}

async function remove(req, res) {
  const skillId = validator.integer(req.params.skillId, '技能编号');
  success(res, await favoriteService.removeFavorite(req.user.user_id, skillId), '已取消收藏');
}

module.exports = { list, add, remove };
