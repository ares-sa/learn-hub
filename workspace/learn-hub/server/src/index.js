require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./models/db');
const authRoutes = require('./routes/auth');
const knowledgeRoutes = require('./routes/knowledge');
const planRoutes = require('./routes/plan');
const learnRoutes = require('./routes/learn');
const reviewRoutes = require('./routes/review');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 确保uploads目录存在
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

async function startServer() {
  // 初始化数据库
  await initDatabase();

  // 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/plan', planRoutes);
  app.use('/api/learn', learnRoutes);
  app.use('/api/review', reviewRoutes);
  app.use('/api/stats', statsRoutes);

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 静态文件（前端）
  const webDistPath = path.join(__dirname, '../../web/dist');
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    
    // 前端路由兜底
    app.get('*', (req, res) => {
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  } else {
    // 前端未构建，返回提示
    app.get('*', (req, res) => {
      res.json({ 
        message: 'Learn Hub API 运行中', 
        frontend: '前端未构建，请运行 cd web && npm run build' 
      });
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 学习助手服务已启动: http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
