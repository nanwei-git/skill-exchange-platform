const { AppError } = require('./AppError');

function text(value, field, options = {}) {
  const { required = true, min = 1, max = 255 } = options;
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw new AppError(400, 'VALIDATION_ERROR', `${field}不能为空`, { field });
  }
  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', `${field}必须是字符串`, { field });
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field}长度必须在${min}到${max}个字符之间`, { field });
  }
  return normalized;
}

function integer(value, field, options = {}) {
  const { required = true, min = 1, max = Number.MAX_SAFE_INTEGER } = options;
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw new AppError(400, 'VALIDATION_ERROR', `${field}不能为空`, { field });
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field}必须是${min}到${max}之间的整数`, { field });
  }
  return parsed;
}

function oneOf(value, field, allowed, options = {}) {
  const { required = true } = options;
  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw new AppError(400, 'VALIDATION_ERROR', `${field}不能为空`, { field });
  }
  if (!allowed.includes(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field}必须是：${allowed.join('、')}`, { field });
  }
  return value;
}

function email(value, options = {}) {
  const normalized = text(value, 'email', { ...options, max: 100 });
  if (normalized === null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError(400, 'VALIDATION_ERROR', '邮箱格式不正确', { field: 'email' });
  }
  return normalized.toLowerCase();
}

function pagination(query) {
  const page = integer(query.page || 1, 'page', { min: 1, max: 100000 });
  const limit = integer(query.limit || 12, 'limit', { min: 1, max: 50 });
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { text, integer, oneOf, email, pagination };
