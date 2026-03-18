# Learn Hub 部署指南

## 环境要求

- Node.js 18+
- npm 9+
- 4GB+ 内存
- 10GB+ 磁盘空间

## 部署步骤

### 1. 上传代码

将整个 `learn-hub` 文件夹上传到你的服务器。

### 2. 安装依赖

```bash
# 进入项目目录
cd learn-hub

# 安装后端依赖
cd server
npm install

# 返回上级，安装前端依赖
cd ../web
npm install
```

### 3. 构建前端

```bash
cd web
npm run build
```

构建完成后，前端静态文件会生成在 `web/dist` 目录。

### 4. 启动服务

```bash
# 启动后端（会自动服务前端静态文件）
cd ../server
node src/index.js
```

服务启动后，访问 `http://localhost:3000` 即可使用。

### 5. 外部访问（可选）

如果需要从其他设备访问：

#### 方案A：使用内网穿透
```bash
# 安装 natapp 或类似工具
# 配置后得到一个外网地址
```

#### 方案B：使用 Cloudflare Tunnel
```bash
# 安装 cloudflared
cloudflared tunnel --url http://localhost:3000
```

#### 方案C：配置路由器端口映射
- 登录路由器后台
- 将外网端口 3000 映射到服务器的 3000 端口
- 使用路由器分配的外网IP访问

## 目录结构说明

```
learn-hub/
├── server/           # 后端服务
│   ├── src/
│   │   ├── index.js        # 主入口
│   │   ├── models/db.js    # 数据库
│   │   ├── services/       # AI服务
│   │   └── routes/        # API路由
│   ├── data/        # SQLite数据库文件
│   ├── uploads/     # 上传的文件
│   └── package.json
│
├── web/             # 前端应用
│   ├── dist/       # 构建后的静态文件
│   ├── src/        # 源代码
│   └── package.json
│
└── README.md
```

## 常用命令

```bash
# 查看运行状态
ps aux | grep node

# 停止服务
pkill -f "node src/index.js"

# 重启服务
pkill -f "node src/index.js" && cd learn-hub/server && node src/index.js &

# 查看日志
tail -f learn-hub/server.log
```

## 常见问题

### 端口被占用
修改 `server/.env` 中的 PORT 为其他端口。

### 数据库错误
删除 `server/data/learnhub.db` 文件，重新启动会自动创建。

### AI 调用失败
检查网络连接，确保能访问 AI API。

## 后续更新

更新代码后：
```bash
cd learn-hub
git pull  # 如果使用git
cd web && npm run build
# 重启服务
```

---

有问题随时问我！🦞
