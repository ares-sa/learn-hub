#!/bin/bash

# Learn Hub 启动脚本

echo "🚀 启动 Learn Hub..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd "$(dirname "$0")/server"
if [ ! -d "node_modules" ]; then
    npm install
fi

# 创建数据目录
mkdir -p data uploads

# 启动后端
echo "🔌 启动后端服务..."
PORT=3000 node src/index.js
