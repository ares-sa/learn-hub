const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'learn-hub-secret-key';

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }

    // 检查用户是否存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    // 创建用户
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    db.prepare('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)').run(id, username, email || null, passwordHash);
    
    // 创建默认设置
    db.prepare('INSERT INTO user_settings (id, user_id) VALUES (?, ?)').run(uuidv4(), id);

    // 生成token
    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id, username, email } });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' });
    }

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
});

// 更新密码
router.put('/password', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { oldPassword, newPassword } = req.body;

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(decoded.userId);
    const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
    
    if (!validPassword) {
      return res.status(400).json({ error: '原密码错误' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, decoded.userId);

    res.json({ message: '密码更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新密码失败' });
  }
});

module.exports = router;
