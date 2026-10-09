# 个人技能交换平台

计算机编程实践终结性大作业。项目使用 Node.js、Express、MySQL 和原生 HTML/CSS/JavaScript，实现从技能发布、交换申请、双方确认到互相评价的完整业务闭环。

## 功能与规模

- 7 张关联数据表，每张表至少 5 条测试数据
- 29 个 REST API
- JWT 登录认证、bcrypt 密码哈希和所有权校验
- 技能 CRUD、分页、关键词/分类/类型/地点筛选
- 交换申请、接受/拒绝、双方确认、互评
- 收藏、通知、个性化推荐和个人统计
- 响应式原生前端

## 目录结构

```text
skill-exchange-platform/
├── config/              # MySQL 连接池
├── controllers/         # 参数接收与响应
├── services/            # 业务逻辑和 SQL
├── routes/              # 29 个接口路由
├── middlewares/         # JWT、404、全局错误处理
├── utils/               # 校验、响应和环境变量工具
├── public/              # 原生前端页面
├── docs/                # OpenAPI、Apifox 与 REST Client 文档
├── scripts/             # OpenAPI 和源码检查脚本
├── tests/               # 自动冒烟测试
├── init_db.sql          # 建库、建表和测试数据
└── server.js            # 服务入口
```

## 本地启动（PowerShell）

```powershell
# 在解压目录的上一级执行
Set-Location .\skill-exchange-platform
npm.cmd ci
Copy-Item .env.example .env
notepad .env
mysql --default-character-set=utf8mb4 -u root -p -e "source ./init_db.sql"
npm.cmd start
```

浏览器访问 `http://localhost:3000`。演示账号为 `linxia`、`zhouyu`、`chenmo`、`sunan`、`tangguo`、`jianghe`，密码统一为 `123456`。

## CMD 一键启动

双击项目根目录的 `启动项目.cmd`，按提示输入 MySQL root 密码即可。脚本会检查 MySQL、`skill_exchange` 数据库、`.env` 和 Node.js 依赖，然后执行 `npm run dev`。

首次使用若提示数据库不存在，先在 CMD 中执行以下命令导入数据（该操作会重建数据库）：

```cmd
mysql -u root -p --default-character-set=utf8mb4 < init_db.sql
```

请检查 `.env` 是否包含敏感信息，不要提交到仓库，也不要放入最终压缩包。

## 测试

服务启动后打开另一个 PowerShell：

```powershell
Set-Location .\week4\skill-exchange-platform
npm.cmd run check
npm.cmd run smoke
```

接口集合可将 `docs/openapi.json` 导入 Apifox。自动冒烟测试会创建额外测试数据，重复测试前建议重新导入 `init_db.sql`。

需要自己补拍报告截图或录制讲解视频时，严格按照 `docs/截图与录屏操作步骤.md` 的数据库、Apifox、前端和双账号交换顺序操作。
