# Apifox 导入与截图清单

## 导入

1. 打开 Apifox，选择“导入项目”。
2. 导入 `docs/openapi.json`，项目名设为 `[24002120509-杨庆鸿] 技能交换平台`。
3. 新建本地环境，前置 URL 设为 `http://localhost:3000`。
4. 先执行“用户登录”，复制 `data.token`。
5. 在项目 Auth 中选择 Bearer Token，粘贴 Token，并应用到全部受保护接口。

## 报告截图顺序

截图中必须同时保留左侧接口树、请求 URL、请求参数、HTTP 状态码和响应 JSON：

1. 健康检查：`GET /api/health`。
2. 登录成功：`POST /api/auth/login`。
3. 登录密码错误：同一接口返回 401。
4. 技能分页筛选：`GET /api/skills?type=offer&sort=popular`。
5. 发布技能：`POST /api/skills`。
6. 发起交换：`POST /api/exchanges`。
7. 接受申请：`PATCH /api/exchanges/{id}/decision`。
8. 双方确认完成：`POST /api/exchanges/{id}/confirm`。
9. 发布评价：`POST /api/reviews`。
10. 个人统计：`GET /api/stats/me`。

建议截图分辨率不低于 1600×900。项目名与环境名必须包含 `24002120509-杨庆鸿`，以满足身份识别要求。
