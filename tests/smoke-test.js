const assert = require('assert/strict');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
let passed = 0;

async function request(name, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json();
  const expected = options.expected || 200;
  assert.equal(response.status, expected, `${name}：期望 ${expected}，实际 ${response.status}，${payload.message}`);
  for (const key of ['success', 'data', 'error', 'message']) {
    assert.ok(Object.hasOwn(payload, key), `${name}：响应缺少 ${key}`);
  }
  assert.equal(payload.success, expected < 400, `${name}：success 与状态码不一致`);
  passed += 1;
  console.log(`[PASS ${String(passed).padStart(2, '0')}] ${name}`);
  return payload.data;
}

async function main() {
  const health = await request('健康检查', '/api/health');
  assert.equal(health.name, '个人技能交换平台 API');

  const categories = await request('技能分类不少于5项', '/api/categories');
  assert.ok(categories.length >= 5);
  await request('无Token访问受保护接口', '/api/auth/me', { expected: 401 });
  await request('错误密码登录', '/api/auth/login', { method: 'POST', body: { username: 'linxia', password: 'wrong-password' }, expected: 401 });
  await request('重复用户名注册', '/api/auth/register', { method: 'POST', body: { username: 'linxia', password: '123456', email: 'duplicate@example.com' }, expected: 409 });

  const linxia = await request('林夏登录', '/api/auth/login', { method: 'POST', body: { username: 'linxia', password: '123456' } });
  const zhouyu = await request('周雨登录', '/api/auth/login', { method: 'POST', body: { username: 'zhouyu', password: '123456' } });
  await request('获取当前用户', '/api/auth/me', { token: linxia.token });
  const skillList = await request('技能分页与筛选', '/api/skills?page=1&limit=5&type=offer&sort=popular');
  assert.equal(skillList.items.length, 5);

  const targetSkill = await request('林夏发布测试技能', '/api/skills', {
    method: 'POST', token: linxia.token, expected: 201,
    body: { categoryId: 1, type: 'offer', title: '自动测试 Node API', description: '用于自动冒烟测试的目标技能，测试完成后可以下架。', locationType: 'online', coverUrl: '' },
  });
  const offerSkill = await request('周雨发布测试技能', '/api/skills', {
    method: 'POST', token: zhouyu.token, expected: 201,
    body: { categoryId: 2, type: 'offer', title: '自动测试英语陪练', description: '用于验证技能交换完整流程的测试技能说明。', locationType: 'online', coverUrl: '' },
  });
  await request('越权修改他人技能', `/api/skills/${offerSkill.skill_id}`, { method: 'PUT', token: linxia.token, body: { title: '非法修改标题' }, expected: 404 });
  await request('禁止申请自己的技能', '/api/exchanges', {
    method: 'POST', token: zhouyu.token,
    body: { offerSkillId: offerSkill.skill_id, requestSkillId: offerSkill.skill_id, message: '不允许的自交换' }, expected: 400,
  });

  const exchange = await request('发起交换申请', '/api/exchanges', {
    method: 'POST', token: zhouyu.token, expected: 201,
    body: { offerSkillId: offerSkill.skill_id, requestSkillId: targetSkill.skill_id, message: '自动测试完整交换流程。' },
  });
  await request('非接收人不能审核', `/api/exchanges/${exchange.exchange_id}/decision`, { method: 'PATCH', token: zhouyu.token, body: { decision: 'accept' }, expected: 403 });
  const accepted = await request('接收人接受申请', `/api/exchanges/${exchange.exchange_id}/decision`, { method: 'PATCH', token: linxia.token, body: { decision: 'accept' } });
  assert.equal(accepted.status, 'accepted');
  const firstConfirm = await request('申请人确认完成', `/api/exchanges/${exchange.exchange_id}/confirm`, { method: 'POST', token: zhouyu.token });
  assert.equal(firstConfirm.status, 'accepted');
  const completed = await request('接收人确认完成', `/api/exchanges/${exchange.exchange_id}/confirm`, { method: 'POST', token: linxia.token });
  assert.equal(completed.status, 'completed');

  await request('申请人发布评价', '/api/reviews', { method: 'POST', token: zhouyu.token, expected: 201, body: { exchangeId: exchange.exchange_id, rating: 5, content: '自动测试评价：讲解清晰。' } });
  await request('接收人发布评价', '/api/reviews', { method: 'POST', token: linxia.token, expected: 201, body: { exchangeId: exchange.exchange_id, rating: 4, content: '自动测试评价：交流顺利。' } });
  await request('禁止重复评价', '/api/reviews', { method: 'POST', token: linxia.token, body: { exchangeId: exchange.exchange_id, rating: 5, content: '重复评价' }, expected: 409 });

  await request('收藏技能', `/api/favorites/${offerSkill.skill_id}`, { method: 'POST', token: linxia.token, expected: 201 });
  const duplicateFavorite = await request('重复收藏保持幂等', `/api/favorites/${offerSkill.skill_id}`, { method: 'POST', token: linxia.token, expected: 201 });
  assert.equal(duplicateFavorite.added, false);
  await request('获取收藏列表', '/api/favorites', { token: linxia.token });
  await request('取消收藏', `/api/favorites/${offerSkill.skill_id}`, { method: 'DELETE', token: linxia.token });
  await request('获取通知', '/api/notifications', { token: linxia.token });
  await request('全部通知已读', '/api/notifications/read-all', { method: 'PATCH', token: linxia.token });
  const stats = await request('获取个人统计', '/api/stats/me', { token: linxia.token });
  assert.ok(Number(stats.completed_exchange_count) >= 1);
  await request('下架已完成交换的技能', `/api/skills/${targetSkill.skill_id}`, { method: 'DELETE', token: linxia.token });
  await request('统一404响应', '/api/not-exists', { expected: 404 });

  console.log(`\n冒烟测试完成：${passed} 个场景全部通过。`);
}

main().catch((error) => {
  console.error('\n[FAIL]', error.message);
  process.exit(1);
});
