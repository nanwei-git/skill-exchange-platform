const exchangeService = require('../services/exchangeService');
const { success } = require('../utils/response');
const validator = require('../utils/validator');

async function create(req, res) {
  const payload = {
    offerSkillId: validator.integer(req.body.offerSkillId, 'offerSkillId'),
    requestSkillId: validator.integer(req.body.requestSkillId, 'requestSkillId'),
    message: validator.text(req.body.message, 'message', { required: false, max: 500 }),
  };
  success(res, await exchangeService.createExchange(req.user.user_id, payload), '交换申请已提交', 201);
}

async function list(req, res) {
  const filters = {
    role: req.query.role === undefined
      ? 'all'
      : validator.oneOf(req.query.role, 'role', ['all', 'sent', 'received']),
    status: req.query.status === undefined
      ? null
      : validator.oneOf(req.query.status, 'status', ['pending', 'accepted', 'rejected', 'cancelled', 'completed']),
  };
  success(res, await exchangeService.listExchanges(req.user.user_id, filters), '获取交换申请成功');
}

async function detail(req, res) {
  const exchangeId = validator.integer(req.params.id, '交换编号');
  success(res, await exchangeService.getExchange(exchangeId, req.user.user_id), '获取交换详情成功');
}

async function decide(req, res) {
  const exchangeId = validator.integer(req.params.id, '交换编号');
  const decision = validator.oneOf(req.body.decision, 'decision', ['accept', 'reject']);
  success(res, await exchangeService.decideExchange(exchangeId, req.user.user_id, decision), '申请处理成功');
}

async function confirm(req, res) {
  const exchangeId = validator.integer(req.params.id, '交换编号');
  success(res, await exchangeService.confirmExchange(exchangeId, req.user.user_id), '完成状态已确认');
}

async function cancel(req, res) {
  const exchangeId = validator.integer(req.params.id, '交换编号');
  success(res, await exchangeService.cancelExchange(exchangeId, req.user.user_id), '交换申请已撤销');
}

module.exports = { create, list, detail, decide, confirm, cancel };
