const { failure } = require('../utils/response');

function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;

  if (error.code === 'ER_DUP_ENTRY') {
    failure(res, { code: 'DUPLICATE_RESOURCE', details: null }, '数据已存在', 409);
    return;
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    failure(res, { code: 'RELATED_RESOURCE_NOT_FOUND', details: null }, '关联数据不存在', 400);
    return;
  }

  const status = Number(error.status || 500);
  const code = error.code || 'INTERNAL_ERROR';
  const message = status >= 500 ? '服务器内部错误' : error.message;
  if (status >= 500) console.error(error);
  failure(res, { code, details: error.details || null }, message, status);
}

module.exports = { errorHandler };
