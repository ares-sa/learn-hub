const express = require('express');
const { db } = require('../models/db');
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

// 获取概览统计
router.get('/overview', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // 知识库数量
    const knowledgeCount = db.prepare('SELECT COUNT(*) as count FROM knowledge_base WHERE user_id = ?').get(req.userId);

    // 知识点数量
    const nodeCount = db.prepare(`
      SELECT COUNT(*) as count FROM knowledge_nodes kn
      JOIN knowledge_base kb ON kn.base_id = kb.id
      WHERE kb.user_id = ?
    `).get(req.userId);

    // 今日学习时长
    const todayDuration = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as minutes FROM learning_records
      WHERE user_id = ? AND created_at >= ?
    `).get(req.userId, today);

    // 本周学习天数
    const weekActive = db.prepare(`
      SELECT COUNT(DISTINCT date(created_at)) as days FROM learning_records
      WHERE user_id = ? AND created_at >= ?
    `).get(req.userId, weekAgoStr);

    // 计划完成率
    const planStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM plan_items pi JOIN study_plans sp ON pi.plan_id = sp.id WHERE sp.user_id = ? AND pi.status = 'completed') as completed,
        (SELECT COUNT(*) FROM plan_items pi JOIN study_plans sp ON pi.plan_id = sp.id WHERE sp.user_id = ?) as total
    `).get(req.userId, req.userId);

    const completionRate = planStats.total > 0 ? Math.round((planStats.completed / planStats.total) * 100) : 0;

    // 今日任务
    const todayTasks = db.prepare(`
      SELECT COUNT(*) as count FROM plan_items pi
      JOIN study_plans sp ON pi.plan_id = sp.id
      WHERE sp.user_id = ? AND pi.scheduled_date <= ? AND pi.status != 'completed'
    `).get(req.userId, today);

    res.json({
      knowledgeBases: knowledgeCount?.count || 0,
      knowledgeNodes: nodeCount?.count || 0,
      todayMinutes: todayDuration?.minutes || 0,
      weekActiveDays: weekActive?.days || 0,
      completionRate,
      pendingTasks: todayTasks?.count || 0
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 获取学习趋势
router.get('/trend', authenticate, (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

    const trend = db.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as actions,
        SUM(duration) as minutes,
        SUM(CASE WHEN correct = 1 THEN 1 ELSE 0 END) as correct
      FROM learning_records
      WHERE user_id = ? AND created_at >= ?
      GROUP BY date(created_at)
      ORDER BY date
    `).all(req.userId, startDateStr);

    res.json(trend);
  } catch (error) {
    console.error('获取趋势失败:', error);
    res.status(500).json({ error: '获取趋势失败' });
  }
});

// 获取各知识库进度
router.get('/progress', authenticate, (req, res) => {
  try {
    const progress = db.prepare(`
      SELECT 
        kb.id, kb.title,
        (SELECT COUNT(*) FROM knowledge_nodes WHERE base_id = kb.id) as nodes,
        (SELECT COUNT(*) FROM plan_items pi JOIN study_plans sp ON pi.plan_id = sp.id WHERE sp.base_id = kb.id AND pi.status = 'completed') as completed,
        (SELECT MAX(pi.mastery_level) FROM plan_items pi JOIN study_plans sp ON pi.plan_id = sp.id WHERE sp.base_id = kb.id) as mastery
      FROM knowledge_base kb
      WHERE kb.user_id = ?
    `).all(req.userId);

    res.json(progress);
  } catch (error) {
    console.error('获取进度失败:', error);
    res.status(500).json({ error: '获取进度失败' });
  }
});

// 获取最近活动
router.get('/activity', authenticate, (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const activities = db.prepare(`
      SELECT lr.*, kn.title as node_title
      FROM learning_records lr
      LEFT JOIN knowledge_nodes kn ON lr.node_id = kn.id
      WHERE lr.user_id = ?
      ORDER BY lr.created_at DESC
      LIMIT ?
    `).all(req.userId, parseInt(limit));

    res.json(activities);
  } catch (error) {
    console.error('获取活动失败:', error);
    res.status(500).json({ error: '获取活动失败' });
  }
});

module.exports = router;
