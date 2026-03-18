const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/db');
const { calculateNextReview } = require('../services/aiService');
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

// 获取今日复习任务
router.get('/today', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const reviews = db.prepare(`
      SELECT rr.*, kn.title as node_title, kn.content as node_content
      FROM review_records rr
      JOIN knowledge_nodes kn ON rr.node_id = kn.id
      WHERE rr.user_id = ? AND rr.next_review <= ? AND rr.status != 'completed'
      ORDER BY rr.next_review
      LIMIT 20
    `).all(req.userId, today);

    res.json(reviews);
  } catch (error) {
    console.error('获取复习任务失败:', error);
    res.status(500).json({ error: '获取复习任务失败' });
  }
});

// 获取复习的练习题
router.get('/exercises/:nodeId', authenticate, (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const exercises = db.prepare('SELECT * FROM exercises WHERE node_id = ?').all(nodeId);
    
    // 随机返回
    const shuffled = exercises.sort(() => 0.5 - Math.random());
    res.json(shuffled.slice(0, 5));
  } catch (error) {
    console.error('获取复习题失败:', error);
    res.status(500).json({ error: '获取复习题失败' });
  }
});

// 提交复习结果
router.post('/submit', authenticate, (req, res) => {
  try {
    const { nodeId, quality } = req.body; // quality: 0-5 遗忘程度

    // 获取当前复习记录
    const review = db.prepare(`
      SELECT * FROM review_records 
      WHERE node_id = ? AND user_id = ? AND status != 'completed'
      ORDER BY next_review DESC LIMIT 1
    `).get(nodeId, req.userId);

    if (!review) {
      return res.status(404).json({ error: '复习记录不存在' });
    }

    // 计算下次复习时间
    const nextReview = calculateNextReview(quality, review.ease_factor, review.interval_days, review.repetition);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextReview.interval);

    // 更新复习记录
    db.prepare(`
      UPDATE review_records 
      SET reviewed_at = CURRENT_TIMESTAMP, 
          quality = ?,
          next_review = ?,
          interval_days = ?,
          ease_factor = ?,
          repetition = ?,
          status = 'completed'
      WHERE id = ?
    `).run(quality, nextDate.toISOString().split('T')[0], nextReview.interval, nextReview.easeFactor, nextReview.repetition, review.id);

    // 记录学习
    const recordId = uuidv4();
    db.prepare(`
      INSERT INTO learning_records (id, user_id, node_id, action, duration, correct)
      VALUES (?, ?, ?, 'review', ?, ?)
    `).run(recordId, req.userId, nodeId, 300, quality >= 3 ? 1 : 0);

    res.json({
      message: '复习完成',
      nextReview: nextDate.toISOString().split('T')[0],
      interval: nextReview.interval,
      status: quality >= 3 ? '记忆良好' : '需要加强'
    });
  } catch (error) {
    console.error('提交复习结果失败:', error);
    res.status(500).json({ error: '提交复习结果失败' });
  }
});

// 获取复习统计
router.get('/stats', authenticate, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 今日复习统计
    const todayReview = db.prepare(`
      SELECT COUNT(*) as count, SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END) as passed
      FROM review_records 
      WHERE user_id = ? AND reviewed_at >= ?
    `).get(req.userId, today);

    // 待复习数量
    const pendingCount = db.prepare(`
      SELECT COUNT(*) as count FROM review_records 
      WHERE user_id = ? AND next_review <= ? AND status != 'completed'
    `).get(req.userId, today);

    // 掌握度分布
    const masteryDist = db.prepare(`
      SELECT 
        CASE 
          WHEN mastery_level >= 80 THEN '精通'
          WHEN mastery_level >= 60 THEN '熟悉'
          WHEN mastery_level >= 40 THEN '一般'
          ELSE '薄弱'
        END as level,
        COUNT(*) as count
      FROM plan_items pi
      JOIN study_plans sp ON pi.plan_id = sp.id
      WHERE sp.user_id = ? AND pi.mastery_level > 0
      GROUP BY level
    `).all(req.userId);

    res.json({
      todayReviewed: todayReview?.count || 0,
      todayPassed: todayReview?.passed || 0,
      pendingCount: pendingCount?.count || 0,
      masteryDistribution: masteryDist
    });
  } catch (error) {
    console.error('获取复习统计失败:', error);
    res.status(500).json({ error: '获取复习统计失败' });
  }
});

// 获取未来的复习安排
router.get('/schedule', authenticate, (req, res) => {
  try {
    const schedule = db.prepare(`
      SELECT next_review as date, COUNT(*) as count
      FROM review_records
      WHERE user_id = ? AND next_review > date('now')
      GROUP BY next_review
      ORDER BY next_review
      LIMIT 14
    `).all(req.userId);

    res.json(schedule);
  } catch (error) {
    console.error('获取复习安排失败:', error);
    res.status(500).json({ error: '获取复习安排失败' });
  }
});

module.exports = router;
