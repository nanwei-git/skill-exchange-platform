const reviewService = require('../services/reviewService');
const { success } = require('../utils/response');
const validator = require('../utils/validator');

async function create(req, res) {
  const payload = {
    exchangeId: validator.integer(req.body.exchangeId, 'exchangeId'),
    rating: validator.integer(req.body.rating, 'rating', { min: 1, max: 5 }),
    content: validator.text(req.body.content, 'content', { min: 2, max: 500 }),
  };
  success(res, await reviewService.createReview(req.user.user_id, payload), '评价发布成功', 201);
}

async function mine(req, res) {
  success(res, await reviewService.listMine(req.user.user_id), '获取我的评价成功');
}

module.exports = { create, mine };
