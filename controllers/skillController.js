const skillService = require('../services/skillService');
const { success } = require('../utils/response');
const validator = require('../utils/validator');

function optionalText(value, field, max) {
  return value === undefined ? null : validator.text(value, field, { required: false, max });
}

async function list(req, res) {
  const filters = {
    keyword: optionalText(req.query.keyword, 'keyword', 100),
    categoryId: req.query.categoryId === undefined ? null : validator.integer(req.query.categoryId, 'categoryId'),
    type: req.query.type === undefined ? null : validator.oneOf(req.query.type, 'type', ['offer', 'request']),
    locationType: req.query.locationType === undefined
      ? null
      : validator.oneOf(req.query.locationType, 'locationType', ['online', 'offline', 'both']),
    sort: req.query.sort === undefined
      ? 'newest'
      : validator.oneOf(req.query.sort, 'sort', ['newest', 'popular', 'favorites']),
  };
  success(res, await skillService.listSkills(filters, validator.pagination(req.query)), '获取技能列表成功');
}

async function detail(req, res) {
  const skillId = validator.integer(req.params.id, '技能编号');
  success(res, await skillService.getSkill(skillId), '获取技能详情成功');
}

async function mine(req, res) {
  success(res, await skillService.listMine(req.user.user_id), '获取我的技能成功');
}

async function recommended(req, res) {
  success(res, await skillService.listRecommended(req.user.user_id), '获取推荐技能成功');
}

async function create(req, res) {
  const payload = {
    categoryId: validator.integer(req.body.categoryId, 'categoryId'),
    type: validator.oneOf(req.body.type, 'type', ['offer', 'request']),
    title: validator.text(req.body.title, 'title', { min: 2, max: 100 }),
    description: validator.text(req.body.description, 'description', { min: 10, max: 2000 }),
    locationType: validator.oneOf(req.body.locationType, 'locationType', ['online', 'offline', 'both']),
    coverUrl: validator.text(req.body.coverUrl, 'coverUrl', { required: false, max: 255 }),
  };
  success(res, await skillService.createSkill(req.user.user_id, payload), '技能发布成功', 201);
}

async function update(req, res) {
  const skillId = validator.integer(req.params.id, '技能编号');
  const changes = {};
  if (Object.hasOwn(req.body, 'categoryId')) changes.categoryId = validator.integer(req.body.categoryId, 'categoryId');
  if (Object.hasOwn(req.body, 'type')) changes.type = validator.oneOf(req.body.type, 'type', ['offer', 'request']);
  if (Object.hasOwn(req.body, 'title')) changes.title = validator.text(req.body.title, 'title', { min: 2, max: 100 });
  if (Object.hasOwn(req.body, 'description')) changes.description = validator.text(req.body.description, 'description', { min: 10, max: 2000 });
  if (Object.hasOwn(req.body, 'locationType')) changes.locationType = validator.oneOf(req.body.locationType, 'locationType', ['online', 'offline', 'both']);
  if (Object.hasOwn(req.body, 'coverUrl')) changes.coverUrl = validator.text(req.body.coverUrl, 'coverUrl', { required: false, max: 255 });
  if (Object.hasOwn(req.body, 'status')) changes.status = validator.oneOf(req.body.status, 'status', ['active', 'inactive']);
  success(res, await skillService.updateSkill(skillId, req.user.user_id, changes), '技能信息已更新');
}

async function deactivate(req, res) {
  const skillId = validator.integer(req.params.id, '技能编号');
  success(res, await skillService.deactivateSkill(skillId, req.user.user_id), '技能已下架');
}

module.exports = { list, detail, mine, recommended, create, update, deactivate };
