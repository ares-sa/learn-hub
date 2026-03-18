const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/db');
const { generateExercises, evaluateMastery, calculateNextReview } = require('../services/aiService');
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

// 学习知识点
router.post('/learn/:nodeId', authenticate, (req, res) => {
  try {
    const { duration = 0 } = req.body;
    const nodeId = req.params.nodeId;

    // 记录学习
    const recordId = uuidv4();
    db.prepare(`
      INSERT INTO learning_records (id, user_id, node_id, action, duration)
      VALUES (?, ?, ?, 'learn', ?)
    `).run(recordId, req.userId, nodeId, duration);

    // 更新计划项状态
    db.prepare(`
      UPDATE plan_items 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
      WHERE node_id = ? AND item_type = 'learn'
      AND plan_id IN (SELECT id FROM study_plans WHERE user_id = ?)
    `).run(nodeId, req.userId);

    res.json({ message: '学习记录已保存' });
  } catch (error) {
    console.error('记录学习失败:', error);
    res.status(500).json({ error: '记录学习失败' });
  }
});

// 获取练习题
router.get('/exercises/:nodeId', authenticate, async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const { count = 5 } = req.query;

    // 先查看是否已有题目
    let exercises = db.prepare('SELECT * FROM exercises WHERE node_id = ?').all(nodeId);

    if (!exercises || exercises.length === 0) {
      // 生成新题目
      const node = db.prepare('SELECT * FROM knowledge_nodes WHERE id = ?').get(nodeId);
      if (!node) {
        return res.status(404).json({ error: '知识点不存在' });
      }

      const result = await generateExercises(nodeId, node.content, count);
      
      if (result.questions && result.questions.length > 0) {
        const insertEx = db.prepare(`
          INSERT INTO exercises (id, node_id, question, answer, question_type, options, explanation, difficulty)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        result.questions.forEach(q => {
          insertEx.run(uuidv4(), nodeId, q.question, q.answer, q.type || 'choice', 
            q.options ? JSON.stringify(q.options) : null, q.explanation, q.difficulty || 1);
        });

        exercises = db.prepare('SELECT * FROM exercises WHERE node_id = ?').all(nodeId);
      }
    }

    // 随机返回指定数量
    const shuffled = exercises.sort(() => 0.5 - Math.random());
    res.json(shuffled.slice(0, parseInt(count)));
  } catch (error) {
    console.error('获取练习题失败:', error);
    res.status(500).json({ error: '获取练习题失败' });
  }
});

// 提交练习答案
router.post('/exercises/submit', authenticate, async (req, res) => {
  try {
    const { nodeId, answers } = req.body;

    // 记录答题
    answers.forEach(answer => {
      const recordId = uuidv4();
      db.prepare(`
        INSERT INTO learning_records (id, user_id, node_id, item_id, item_type, action, correct, score)
        VALUES (?, ?, ?, ?, 'exercise', 'practice', ?, ?)
      `).run(recordId, req.userId, nodeId, answer.exerciseId, answer.correct ? 1 : 0, answer.correct ? 100 : 0);
    });

    // 评估掌握程度
    const evaluation = await evaluateMastery(nodeId, answers);

    // 更新计划项状态
    const correctCount = answers.filter(a => a.correct).length;
    const masteryLevel = Math.round((correctCount / answers.length) * 100);

    db.prepare(`
      UPDATE plan_items 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, mastery_level = ?
      WHERE node_id = ? AND item_type = 'practice'
      AND plan_id IN (SELECT id FROM study_plans WHERE user_id = ?)
    `).run(masteryLevel, nodeId, req.userId);

    // 创建复习记录
    const reviewId = uuidv4();
    const nextReview = calculateNextReview(evaluation.masteryLevel >= 60 ? 4 : 1);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextReview.interval);

    db.prepare(`
      INSERT INTO review_records (id, user_id, node_id, review_date, next_review, interval_days, ease_factor, repetition)
      VALUES (?, ?, ?, date('now'), ?, ?, ?, ?)
    `).run(reviewId, req.userId, nodeId, nextDate.toISOString().split('T')[0], nextReview.interval, nextReview.easeFactor, nextReview.repetition);

    res.json({
      evaluation,
      correctCount,
      totalCount: answers.length,
      masteryLevel
    });
  } catch (error) {
    console.error('提交答案失败:', error);
    res.status(500).json({ error: '提交答案失败' });
  }
});

// 测验
router.post('/test/:nodeId', authenticate, async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const { answers } = req.body;

    // 记录测验
    answers.forEach(answer => {
      const recordId = uuidv4();
      db.prepare(`
        INSERT INTO learning_records (id, user_id, node_id, item_id, item_type, action, correct, score)
        VALUES (?, ?, ?, ?, 'exercise', 'test', ?, ?)
      `).run(recordId, req.userId, nodeId, answer.exerciseId, answer.correct ? 1 : 0, answer.correct ? 100 : 0);
    });

    // 评估
    const evaluation = await evaluateMastery(nodeId, answers);
    const correctCount = answers.filter(a => a.correct).length;
    const masteryLevel = Math.round((correctCount / answers.length) * 100);

    // 更新计划项
    db.prepare(`
      UPDATE plan_items 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, mastery_level = ?
      WHERE node_id = ? AND item_type = 'test'
      AND plan_id IN (SELECT id FROM study_plans WHERE user_id = ?)
    `).run(masteryLevel, nodeId, req.userId);

    // 更新或创建复习记录
    const existingReview = db.prepare('SELECT * FROM review_records WHERE node_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1').get(nodeId, req.userId);
    
    const reviewId = uuidv4();
    const nextReview = calculateNextReview(evaluation.masteryLevel >= 60 ? 4 : 1);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextReview.interval);

    if (existingReview) {
      db.prepare(`
        UPDATE review_records 
        SET next_review = ?, interval_days = ?, ease_factor = ?, repetition = ?, status = 'pending'
        WHERE id = ?
      `).run(nextDate.toISOString().split('T')[0], nextReview.interval, nextReview.easeFactor, nextReview.repetition, existingReview.id);
    } else {
      db.prepare(`
        INSERT INTO review_records (id, user_id, node_id, review_date, next_review, interval_days, ease_factor, repetition)
        VALUES (?, ?, ?, date('now'), ?, ?, ?, ?)
      `).run(reviewId, req.userId, nodeId, nextDate.toISOString().split('T')[0], nextReview.interval, nextReview.easeFactor, nextReview.repetition);
    }

    res.json({
      evaluation,
      correctCount,
      totalCount: answers.length,
      masteryLevel,
      passed: masteryLevel >= 60
    });
  } catch (error) {
    console.error('提交测验失败:', error);
    res.status(500).json({ error: '提交测验失败' });
  }
});

module.exports = router;
