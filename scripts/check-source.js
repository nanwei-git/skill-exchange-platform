const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const failures = [];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'output'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const jsFiles = walk(root).filter((file) => file.endsWith('.js'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${path.relative(root, file)}: ${result.stderr.trim()}`);
}

const openapiPath = path.join(root, 'docs', 'openapi.json');
if (!fs.existsSync(openapiPath)) failures.push('docs/openapi.json 不存在');
else {
  const spec = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
  const count = Object.values(spec.paths).reduce((total, pathItem) => total + Object.keys(pathItem).length, 0);
  if (count !== 29) failures.push(`OpenAPI 接口数为 ${count}，应为 29`);
}

const sql = fs.readFileSync(path.join(root, 'init_db.sql'), 'utf8');
const tableCount = (sql.match(/CREATE TABLE /g) || []).length;
if (tableCount !== 7) failures.push(`数据库表数量为 ${tableCount}，应为 7`);
if (fs.existsSync(path.join(root, '.env'))) failures.push('检测到 .env，请勿将敏感配置放入提交包');

if (failures.length) {
  console.error(`源码检查失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`源码检查通过：${jsFiles.length} 个 JavaScript 文件、7 张表、29 个 API。`);
