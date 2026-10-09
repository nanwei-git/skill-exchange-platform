const categoryService = require('../services/categoryService');
const { success } = require('../utils/response');

async function list(req, res) {
  success(res, await categoryService.listCategories(), '获取技能分类成功');
}

module.exports = { list };
