const fs = require('fs');
const path = require('path');

const standardResponse = {
  description: '统一响应',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
};
const errorResponse = {
  description: '请求失败',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
};

function operation(summary, options = {}) {
  const result = {
    summary,
    tags: [options.tag || '其他'],
    responses: {
      [options.created ? '201' : '200']: standardResponse,
      400: errorResponse,
      401: errorResponse,
      403: errorResponse,
      404: errorResponse,
      409: errorResponse,
    },
  };
  if (options.auth) result.security = [{ bearerAuth: [] }];
  if (options.parameters) result.parameters = options.parameters;
  if (options.body) {
    result.requestBody = {
      required: true,
      content: { 'application/json': { schema: { $ref: `#/components/schemas/${options.body}` } } },
    };
  }
  return result;
}

const idParameter = (name, description) => ({ name, in: 'path', required: true, description, schema: { type: 'integer', minimum: 1 } });
const queryParameter = (name, description, schema = { type: 'string' }) => ({ name, in: 'query', required: false, description, schema });

const spec = {
  openapi: '3.0.3',
  info: {
    title: '[24002120509-杨庆鸿] 技能交换平台',
    version: '1.0.0',
    description: '个人技能交换平台 29 个 REST API。所有接口统一返回 { success, data, error, message }。',
  },
  servers: [{ url: 'http://localhost:3000', description: '本地演示环境' }],
  tags: ['认证', '用户', '分类', '技能', '交换', '评价', '通知', '收藏', '统计'].map((name) => ({ name })),
  paths: {
    '/api/auth/register': { post: operation('用户注册', { tag: '认证', body: 'RegisterRequest', created: true }) },
    '/api/auth/login': { post: operation('用户登录', { tag: '认证', body: 'LoginRequest' }) },
    '/api/auth/me': { get: operation('获取当前用户', { tag: '认证', auth: true }) },
    '/api/users/profile': { put: operation('修改当前用户资料', { tag: '用户', auth: true, body: 'ProfileRequest' }) },
    '/api/users/{id}': { get: operation('获取公开用户资料', { tag: '用户', parameters: [idParameter('id', '用户编号')] }) },
    '/api/users/{id}/reviews': { get: operation('获取用户收到的评价', { tag: '用户', parameters: [idParameter('id', '用户编号')] }) },
    '/api/categories': { get: operation('获取技能分类', { tag: '分类' }) },
    '/api/skills': {
      get: operation('分页筛选技能列表', {
        tag: '技能',
        parameters: [
          queryParameter('page', '页码', { type: 'integer', default: 1 }),
          queryParameter('limit', '每页数量', { type: 'integer', default: 12, maximum: 50 }),
          queryParameter('keyword', '关键词'),
          queryParameter('categoryId', '分类编号', { type: 'integer' }),
          queryParameter('type', 'offer掌握/request想学', { type: 'string', enum: ['offer', 'request'] }),
          queryParameter('locationType', '交换方式', { type: 'string', enum: ['online', 'offline', 'both'] }),
          queryParameter('sort', '排序', { type: 'string', enum: ['newest', 'popular', 'favorites'] }),
        ],
      }),
      post: operation('发布技能', { tag: '技能', auth: true, body: 'SkillRequest', created: true }),
    },
    '/api/skills/mine': { get: operation('获取我的技能', { tag: '技能', auth: true }) },
    '/api/skills/recommended': { get: operation('获取推荐技能', { tag: '技能', auth: true }) },
    '/api/skills/{id}': {
      get: operation('获取技能详情', { tag: '技能', parameters: [idParameter('id', '技能编号')] }),
      put: operation('修改自己的技能', { tag: '技能', auth: true, body: 'SkillRequest', parameters: [idParameter('id', '技能编号')] }),
      delete: operation('下架自己的技能', { tag: '技能', auth: true, parameters: [idParameter('id', '技能编号')] }),
    },
    '/api/exchanges': {
      post: operation('发起交换申请', { tag: '交换', auth: true, body: 'ExchangeRequest', created: true }),
      get: operation('获取我的交换申请', {
        tag: '交换', auth: true,
        parameters: [
          queryParameter('role', '查看范围', { type: 'string', enum: ['all', 'sent', 'received'] }),
          queryParameter('status', '状态', { type: 'string', enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'] }),
        ],
      }),
    },
    '/api/exchanges/{id}': {
      get: operation('获取交换详情', { tag: '交换', auth: true, parameters: [idParameter('id', '交换编号')] }),
      delete: operation('撤销待处理申请', { tag: '交换', auth: true, parameters: [idParameter('id', '交换编号')] }),
    },
    '/api/exchanges/{id}/decision': { patch: operation('接受或拒绝申请', { tag: '交换', auth: true, body: 'DecisionRequest', parameters: [idParameter('id', '交换编号')] }) },
    '/api/exchanges/{id}/confirm': { post: operation('参与者确认完成', { tag: '交换', auth: true, parameters: [idParameter('id', '交换编号')] }) },
    '/api/reviews': { post: operation('发布交换评价', { tag: '评价', auth: true, body: 'ReviewRequest', created: true }) },
    '/api/reviews/mine': { get: operation('获取与我相关的评价', { tag: '评价', auth: true }) },
    '/api/notifications': { get: operation('获取通知列表', { tag: '通知', auth: true }) },
    '/api/notifications/read-all': { patch: operation('全部通知标记已读', { tag: '通知', auth: true }) },
    '/api/notifications/{id}/read': { patch: operation('单条通知标记已读', { tag: '通知', auth: true, parameters: [idParameter('id', '通知编号')] }) },
    '/api/favorites': { get: operation('获取收藏列表', { tag: '收藏', auth: true }) },
    '/api/favorites/{skillId}': {
      post: operation('收藏技能', { tag: '收藏', auth: true, created: true, parameters: [idParameter('skillId', '技能编号')] }),
      delete: operation('取消收藏', { tag: '收藏', auth: true, parameters: [idParameter('skillId', '技能编号')] }),
    },
    '/api/stats/me': { get: operation('获取个人仪表盘统计', { tag: '统计', auth: true }) },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      ApiResponse: {
        type: 'object', required: ['success', 'data', 'error', 'message'],
        properties: { success: { type: 'boolean' }, data: { nullable: true }, error: { nullable: true }, message: { type: 'string' } },
      },
      RegisterRequest: {
        type: 'object', required: ['username', 'password', 'email'],
        properties: { username: { type: 'string', example: 'demo2026' }, password: { type: 'string', example: '123456' }, email: { type: 'string', example: 'demo2026@example.com' }, phone: { type: 'string' }, avatarUrl: { type: 'string' }, bio: { type: 'string' } },
      },
      LoginRequest: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string', example: 'linxia' }, password: { type: 'string', example: '123456' } } },
      ProfileRequest: { type: 'object', properties: { email: { type: 'string' }, phone: { type: 'string' }, avatarUrl: { type: 'string' }, bio: { type: 'string' } } },
      SkillRequest: {
        type: 'object', required: ['categoryId', 'type', 'title', 'description', 'locationType'],
        properties: { categoryId: { type: 'integer', example: 1 }, type: { type: 'string', enum: ['offer', 'request'], example: 'offer' }, title: { type: 'string', example: 'Node.js 入门交流' }, description: { type: 'string', example: '通过小项目交流 Express 路由和数据库操作。' }, locationType: { type: 'string', enum: ['online', 'offline', 'both'], example: 'online' }, coverUrl: { type: 'string', nullable: true } },
      },
      ExchangeRequest: { type: 'object', required: ['offerSkillId', 'requestSkillId'], properties: { offerSkillId: { type: 'integer', example: 3 }, requestSkillId: { type: 'integer', example: 1 }, message: { type: 'string', example: '希望周末线上交流。' } } },
      DecisionRequest: { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['accept', 'reject'] } } },
      ReviewRequest: { type: 'object', required: ['exchangeId', 'rating', 'content'], properties: { exchangeId: { type: 'integer' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, content: { type: 'string' } } },
    },
  },
};

const operationCount = Object.values(spec.paths).reduce((total, pathItem) => total + Object.keys(pathItem).length, 0);
if (operationCount !== 29) throw new Error(`OpenAPI 接口数量应为29，实际为${operationCount}`);

const outputPath = path.join(__dirname, '..', 'docs', 'openapi.json');
fs.writeFileSync(outputPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
console.log(`OpenAPI 已生成：${operationCount} 个接口`);
