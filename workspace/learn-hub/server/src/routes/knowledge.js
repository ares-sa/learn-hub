const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/db');
const { parseKnowledge } = require('../services/aiService');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'learn-hub-secret-key';

// 中间件：验证token
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: '登录已过期' });
  }
}

// 获取用户的所有知识库
router.get('/', authenticate, (req, res) => {
  try {
    const knowledgeBases = db.prepare(`
      SELECT kb.*, 
        (SELECT COUNT(*) FROM knowledge_nodes WHERE base_id = kb.id) as node_count
      FROM knowledge_base kb 
      WHERE kb.user_id = ? 
      ORDER BY kb.updated_at DESC
    `).all(req.userId);

    res.json(knowledgeBases);
  } catch (error) {
    console.error('获取知识库失败:', error);
    res.status(500).json({ error: '获取知识库失败' });
  }
});

// 获取单个知识库详情
router.get('/:id', authenticate, (req, res) => {
  try {
    const base = db.prepare('SELECT * FROM knowledge_base WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!base) {
      return res.status(404).json({ error: '知识库不存在' });
    }

    const nodes = db.prepare('SELECT * FROM knowledge_nodes WHERE base_id = ? ORDER BY order_index').all(req.params.id);
    
    res.json({ ...base, nodes });
  } catch (error) {
    console.error('获取知识库详情失败:', error);
    res.status(500).json({ error: '获取知识库详情失败' });
  }
});

// 创建知识库
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, sourceType = 'text', sourceUrl } = req.body;

    if (!title) {
      return res.status(400).json({ error: '标题必填' });
    }

    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO knowledge_base (id, user_id, title, content, source_type, source_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'processing')
    `).run(id, req.userId, title, content || '', sourceType, sourceUrl || null);

    // AI解析内容
    if (content && content.length > 50) {
      try {
        const parsed = await parseKnowledge(content, title);
        
        if (parsed.nodes && parsed.nodes.length > 0) {
          const insertNode = db.prepare(`
            INSERT INTO knowledge_nodes (id, base_id, title, content, difficulty, estimated_minutes, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          parsed.nodes.forEach((node, index) => {
            insertNode.run(uuidv4(), id, node.title, node.content, node.difficulty || 1, node.minutes || 10, index);
          });

          db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run('ready', id);
        }
      } catch (parseError) {
        console.error('AI解析失败:', parseError);
        db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run('error', id);
      }
    } else {
      db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run('ready', id);
    }

    const newBase = db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(id);
    res.json(newBase);
  } catch (error) {
    console.error('创建知识库失败:', error);
    res.status(500).json({ error: '创建知识库失败' });
  }
});

// 更新知识库
router.put('/:id', authenticate, (req, res) => {
  try {
    const { title, content } = req.body;
    const base = db.prepare('SELECT * FROM knowledge_base WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    
    if (!base) {
      return res.status(404).json({ error: '知识库不存在' });
    }

    db.prepare(`
      UPDATE knowledge_base 
      SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(title || base.title, content || base.content, req.params.id);

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新知识库失败:', error);
    res.status(500).json({ error: '更新知识库失败' });
  }
});

// 删除知识库
router.delete('/:id', authenticate, (req, res) => {
  try {
    const base = db.prepare('SELECT * FROM knowledge_base WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    
    if (!base) {
      return res.status(404).json({ error: '知识库不存在' });
    }

    db.prepare('DELETE FROM knowledge_base WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除知识库失败:', error);
    res.status(500).json({ error: '删除知识库失败' });
  }
});

// 手动触发AI重新解析
router.post('/:id/parse', authenticate, async (req, res) => {
  try {
    const base = db.prepare('SELECT * FROM knowledge_base WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    
    if (!base) {
      return res.status(404).json({ error: '知识库不存在' });
    }

    db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run('processing', req.params.id);

    if (base.content && base.content.length > 50) {
      const parsed = await parseKnowledge(base.content, base.title);
      
      // 删除旧节点
      db.prepare('DELETE FROM knowledge_nodes WHERE base_id = ?').run(req.params.id);

      if (parsed.nodes && parsed.nodes.length > 0) {
        const insertNode = db.prepare(`
          INSERT INTO knowledge_nodes (id, base_id, title, content, difficulty, estimated_minutes, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        parsed.nodes.forEach((node, index) => {
          insertNode.run(uuidv4(), req.params.id, node.title, node.content, node.difficulty || 1, node.minutes || 10, index);
        });
      }

      db.prepare('UPDATE knowledge_base SET status = ? WHERE id = ?').run('ready', req.params.id);
    }

    res.json({ message: '解析完成' });
  } catch (error) {
    console.error('重新解析失败:', error);
    res.status(500).json({ error: '重新解析失败' });
  }
});

module.exports = router;
