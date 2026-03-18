const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/db');
const { generateStudyPlan } = require('../services/aiService');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'learn-hub-secret-key';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '请先登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

// 获取用户的学习计划
router.get('/', authenticate, (req, res) => {
  try {
    const plans = db.prepare(`
      SELECT sp.*, kb.title as base_title,
        (SELECT COUNT(*) FROM plan_items WHERE plan_id = sp.id) as item_count,
        (SELECT COUNT(*) FROM plan_items WHERE plan_id = sp.id AND status = 'completed') as completed_count
      FROM study_plans sp
      LEFT JOIN knowledge_base kb ON sp.base_id = kb.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
    `).all(req.userId);

    res.json(plans);
  } catch (error) {
    console.error('获取计划失败:', error);
    res.status(500).json({ error: '获取计划失败' });
  }
});

// 获取计划详情
router.get('/:id', authenticate, (req, res) => {
  try {
    const plan = db.prepare(`
      SELECT sp.*, kb.title as base_title
      FROM study_plans sp
      LEFT JOIN knowledge_base kb ON sp.base_id = kb.id
      WHERE sp.id = ? AND sp.user_id = ?
    `).get(req.params.id, req.userId);

    if (!plan) {
      return res.status(404).json({ error: '计划不存在' });
    }

    const items = db.prepare(`
      SELECT pi.*, kn.title as node_title, kn.content as node_content
      FROM plan_items pi
      LEFT JOIN knowledge_nodes kn ON pi.node_id = kn.id
      WHERE pi.plan_id = ?
      ORDER BY pi.day_number, pi.id
    `).all(req.params.id);

    res.json({ ...plan, items });
  } catch (error) {
    console.error('获取计划详情失败:', error);
    res.status(500).json({ error: '获取计划详情失败' });
  }
});

// 创建学习计划
router.post('/', authenticate, async (req, res) => {
  try {
    const { baseId, title, description, days, dailyItems } = req.body;

    // 获取知识节点
    const nodes = db.prepare('SELECT * FROM knowledge_nodes WHERE base_id = ? ORDER BY order_index').all(baseId);
    
    if (!nodes || nodes.length === 0) {
      return res.status(400).json({ error: '该知识库还没有知识点，请先添加内容' });
    }

    // 生成计划
    const planResult = await generateStudyPlan(baseId, nodes, { days, dailyItems });

    // 创建计划
    const planId = uuidv4();
    db.prepare(`
      INSERT INTO study_plans (id, user_id, base_id, title, description, total_days, daily_items, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(planId, req.userId, baseId, title || planResult.title, description || planResult.description, days || planResult.days, dailyItems || planResult.dailyItems);

    // 创建计划项
    const insertItem = db.prepare(`
      INSERT INTO plan_items (id, plan_id, node_id, day_number, item_type, scheduled_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const today = new Date();
    planResult.items.forEach(item => {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(scheduledDate.getDate() + item.day - 1);
      insertItem.run(uuidv4(), planId, item.nodeId, item.day, item.type, scheduledDate.toISOString().split('T')[0]);
    });

    const newPlan = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(planId);
    res.json(newPlan);
  } catch (error) {
    console.error('创建计划失败:', error);
    res.status(500).json({ error: '创建计划失败' });
  }
});

// 更新计划状态
router.patch('/:id', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    const plan = db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    
    if (!plan) {
      return res.status(404).json({ error: '计划不存在' });
    }

    db.prepare('UPDATE study_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新计划失败:', error);
    res.status(500).json({ error: '更新计划失败' });
  }
});

// 删除计划
router.delete('/:id', authenticate, (req, res) => {
  try {
    const plan = db.prepare('SELECT * FROM study_plans WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    
    if (!plan) {
      return res.status(404).json({ error: '计划不存在' });
    }

    db.prepare('DELETE FROM study_plans WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除计划失败:', error);
    res.status(500).json({ error: '删除计划失败' });
  }
});

// 获取今日学习任务
router.get('/today/tasks', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const tasks = db.prepare(`
      SELECT pi.*, sp.title as plan_title, kn.title as node_title, kn.content as node_content
      FROM plan_items pi
      JOIN study_plans sp ON pi.plan_id = sp.id
      LEFT JOIN knowledge_nodes kn ON pi.node_id = kn.id
      WHERE sp.user_id = ? AND sp.status = 'active' AND pi.scheduled_date <= ?
      AND pi.status != 'completed'
      ORDER BY pi.scheduled_date, pi.day_number
      LIMIT 10
    `).all(req.userId, today);

    res.json(tasks);
  } catch (error) {
    console.error('获取今日任务失败:', error);
    res.status(500).json({ error: '获取今日任务失败' });
  }
});

module.exports = router;
