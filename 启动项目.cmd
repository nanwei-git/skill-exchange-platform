@echo off
setlocal
chcp 65001 >nul
title 技能交换平台

cd /d "%~dp0"
echo.
echo ========================================
echo   技能交换平台 - 本地启动
echo ========================================

where mysql >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 mysql 命令。
  echo 请先启动 XAMPP 的 MySQL，或将 MySQL 的 bin 目录加入 PATH。
  pause
  exit /b 1
)

if not exist ".env" (
  echo [错误] 缺少 .env 数据库配置文件。
  echo 请复制 .env.example 为 .env，并填写 DB_PASS 和 JWT_SECRET 后重新运行。
  pause
  exit /b 1
)

echo.
echo 正在检查 MySQL 和 skill_exchange 数据库，请输入 MySQL root 密码：
mysql -u root -p -e "USE skill_exchange;" >nul
if errorlevel 1 (
  echo.
  echo [错误] 无法连接 MySQL，或 skill_exchange 数据库尚未导入。
  echo 请确认 MySQL 已启动；首次使用可执行：
  echo mysql -u root -p --default-character-set=utf8mb4 ^< init_db.sql
  echo 注意：init_db.sql 会重建 skill_exchange 数据库并清除旧演示数据。
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 正在安装 Node.js 依赖...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败。
    pause
    exit /b 1
  )
)

echo.
echo 服务启动后，请在浏览器访问：http://localhost:3000
echo 停止服务请按 Ctrl+C。
echo.
call npm run dev

endlocal
