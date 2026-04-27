#!/bin/bash
# Idle Chronicles - 一键部署脚本
set -e

cd ~/idle-rpg

echo "=== 1. 安装系统依赖 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs git nginx

echo "=== 2. 拉取最新代码 ==="
git pull origin main

echo "=== 3. 安装依赖 ==="
cd server && npm install && cd ..
cd client && npm install && cd ..

echo "=== 4. 构建前端 ==="
cd client && npx vite build && cd ..

echo "=== 5. 创建数据目录 ==="
mkdir -p server/storage

echo "=== 6. 安装 PM2 并启动 ==="
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo ""
echo "部署完成！访问 http://$(curl -s ifconfig.me):3001"
echo ""
echo "可选：配置 Nginx 反向代理（见 nginx.conf）"
