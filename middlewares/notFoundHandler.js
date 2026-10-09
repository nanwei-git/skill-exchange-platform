const { failure } = require('../utils/response');

function notFoundHandler(req, res) {
  failure(
    res,
    { code: 'ROUTE_NOT_FOUND', details: { method: req.method, path: req.originalUrl } },
    '接口不存在',
    404,
  );
}

module.exports = { notFoundHandler };
