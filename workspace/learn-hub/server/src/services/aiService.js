const axios = require('axios');

// AI服务配置
const AI_CONFIG = {
  baseUrl: process.env.AI_BASE_URL || 'https://api.miaoda.feishu.cn',
  model: process.env.AI_MODEL || 'miaoda/miaoda-model-auto'
};

// 调用AI API
async function callAI(prompt, options = {}) {
  try {
    const response = await axios.post(`${AI_CONFIG.baseUrl}/v1/chat/completions`, {
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: '你是一个专业的学习助手，擅长知识解析、学习规划和题目生成。你的回答要简洁、实用。' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY || ''}`
      },
      timeout: 30000
    });

    return response.data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('AI调用失败:', error.message);
    // 返回模拟数据用于开发测试
    return getMockResponse(prompt);
  }
}

// 开发环境模拟响应
function getMockResponse(prompt) {
  if (prompt.includes('解析')) {
    return JSON.stringify({
      nodes: [
        { title: '核心概念', content: '这是知识的重点内容...', difficulty: 1, minutes: 10 },
        { title: '进阶知识', content: '深入理解的部分...', difficulty: 2, minutes: 15 },
        { title: '实践应用', content: '实际使用场景...', difficulty: 2, minutes: 20 }
      ]
    });
  }
  if (prompt.includes('计划')) {
    return JSON.stringify({
      days: 7,
      dailyItems: 3,
      title: '7天学习计划',
      items: [
        { day: 1, topics: ['基础概念'], type: 'learn' },
        { day: 2, topics: ['核心知识'], type: 'practice' },
        { day: 3, topics: ['综合应用'], type: 'test' }
      ]
    });
  }
  if (prompt.includes('题目')) {
    return JSON.stringify({
      questions: [
        {
          question: '什么是艾宾浩斯遗忘曲线？',
          type: 'choice',
          options: ['记忆规律', '学习方法', '时间管理', '注意力'],
          answer: '记忆规律',
          explanation: '艾宾浩斯遗忘曲线描述了记忆随时间遗忘的规律'
        }
      ]
    });
  }
  return '';
}

// 解析知识内容，生成结构化节点
async function parseKnowledge(content, title) {
  const prompt = `请分析以下知识内容，提取关键知识点并结构化。要求：
1. 将内容拆分成3-7个知识点节点
2. 每个节点包含：标题、核心内容、难度等级(1-3)、预估学习时间(分钟)
3. 知识内容：${content.slice(0, 2000)}

请返回JSON格式：
{
  "nodes": [
    {"title": "节点标题", "content": "核心内容", "difficulty": 1, "minutes": 10}
  ]
}`;

  const result = await callAI(prompt);
  try {
    return JSON.parse(result);
  } catch {
    return { nodes: [{ title: '核心内容', content, difficulty: 1, minutes: 15 }] };
  }
}

// 生成学习计划
async function generateStudyPlan(baseId, nodes, options = {}) {
  const nodeList = nodes.map((n, i) => `${i + 1}. ${n.title} (${n.difficulty}星, ${n.minutes}分钟)`).join('\n');
  
  const prompt = `请为以下知识节点生成学习计划：
知识库ID: ${baseId}
知识节点：
${nodeList}

用户每天可学习: ${options.dailyItems || 3}个知识点
计划周期: ${options.days || 7}天

要求：
1. 每天安排学习、练习、测试环节
2. 遵循循序渐进原则
3. 适当安排复习

返回JSON格式：
{
  "title": "计划标题",
  "description": "计划描述",
  "days": 7,
  "dailyItems": 3,
  "items": [
    {"day": 1, "nodeId": "节点ID", "type": "learn/practice/test", "topic": "学习主题"}
  ]
}`;

  const result = await callAI(prompt);
  try {
    return JSON.parse(result);
  } catch {
    return {
      days: Math.ceil(nodes.length / (options.dailyItems || 3)),
      items: nodes.map((n, i) => ({
        day: Math.floor(i / (options.dailyItems || 3)) + 1,
        nodeId: n.id,
        type: i % 3 === 0 ? 'learn' : i % 3 === 1 ? 'practice' : 'test',
        topic: n.title
      }))
    };
  }
}

// 生成练习题
async function generateExercises(nodeId, nodeContent, count = 5) {
  const prompt = `请为以下知识点生成${count}道练习题：
知识点：${nodeContent.slice(0, 500)}

要求：
1. 题型包含选择、判断、填空
2. 难度适中
3. 附上正确答案和解析

返回JSON格式：
{
  "questions": [
    {
      "question": "问题内容",
      "type": "choice/fill/blank",
      "options": ["选项1", "选项2", "选项3", "选项4"],
      "answer": "正确答案",
      "explanation": "解析"
    }
  ]
}`;

  const result = await callAI(prompt);
  try {
    return JSON.parse(result);
  } catch {
    return {
      questions: [
        {
          question: `${nodeContent.slice(0, 50)}的核心要点是什么？`,
          type: 'choice',
          options: ['要点A', '要点B', '要点C', '要点D'],
          answer: '要点A',
          explanation: '这是该知识点的核心内容'
        }
      ]
    };
  }
}

// 评估掌握程度
async function evaluateMastery(nodeId, answers) {
  const prompt = `请评估用户对知识点的掌握程度：
知识点ID: ${nodeId}
用户答题情况：${JSON.stringify(answers)}

请返回JSON格式：
{
  "masteryLevel": 0-100,
  "strengths": ["擅长点"],
  "weaknesses": ["薄弱点"],
  "suggestions": ["改进建议"]
}`;

  const result = await callAI(prompt);
  try {
    return JSON.parse(result);
  } catch {
    const correct = answers.filter(a => a.correct).length;
    const mastery = Math.round((correct / answers.length) * 100);
    return {
      masteryLevel: mastery,
      strengths: ['基础概念'],
      weaknesses: ['需要更多练习'],
      suggestions: ['建议复习相关内容']
    };
  }
}

// 计算下次复习时间（艾宾浩斯算法）
function calculateNextReview(quality, easeFactor = 2.5, interval = 1, repetition = 0) {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetition = repetition;

  if (quality >= 3) {
    if (repetition === 0) {
      newInterval = 1;
    } else if (repetition === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetition = repetition + 1;
  } else {
    newRepetition = 0;
    newInterval = 1;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetition: newRepetition,
    nextReview: nextDate.toISOString().split('T')[0]
  };
}

module.exports = {
  callAI,
  parseKnowledge,
  generateStudyPlan,
  generateExercises,
  evaluateMastery,
  calculateNextReview
};
