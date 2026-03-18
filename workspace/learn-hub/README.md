# Learn Hub - 记忆工坊

智能学习助手，根据知识自动生成学习计划，练习做题，测试掌握程度，执行复习计划，达到长期记忆。

## 功能特性

- 📚 **知识库管理** - 上传知识，AI自动解析结构化
- 📅 **学习计划** - AI生成个性化学习路径
- 📝 **练习测验** - 自动生成练习题和测验
- 🔄 **复习系统** - 艾宾浩斯遗忘曲线智能复习
- 📊 **进度统计** - 学习数据可视化

## 技术栈

- 后端: Node.js + Express + SQLite
- 前端: React + Vite
- AI: 妙搭大模型

## 快速启动

### 开发模式

```bash
# 后端
cd server
npm install
npm run dev

# 前端
cd web
npm install
npm run dev
```

### 生产部署

```bash
# 构建前端
cd web
npm install
npm run build

# 使用PM2启动后端
cd ../server
npm install
pm2 start src/index.js --name learn-hub
```

## 环境变量

详见 `server/.env`

## 许可证

MIT
