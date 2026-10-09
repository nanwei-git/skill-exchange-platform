const authService = require('../services/authService');
const { success } = require('../utils/response');
const validator = require('../utils/validator');

async function register(req, res) {
  const payload = {
    username: validator.text(req.body.username, 'username', { min: 3, max: 50 }),
    password: validator.text(req.body.password, 'password', { min: 6, max: 72 }),
    email: validator.email(req.body.email),
    phone: validator.text(req.body.phone, 'phone', { required: false, max: 20 }),
    avatarUrl: validator.text(req.body.avatarUrl, 'avatarUrl', { required: false, max: 255 }),
    bio: validator.text(req.body.bio, 'bio', { required: false, max: 300 }),
  };
  success(res, await authService.register(payload), '注册成功', 201);
}

async function login(req, res) {
  const username = validator.text(req.body.username, 'username', { max: 50 });
  const password = validator.text(req.body.password, 'password', { max: 72 });
  success(res, await authService.login(username, password), '登录成功');
}

async function me(req, res) {
  success(res, await authService.getCurrentUser(req.user.user_id), '获取当前用户成功');
}

module.exports = { register, login, me };
