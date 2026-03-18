const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let db = null;

const dbPath = path.join(__dirname, '../../data/learnhub.db');

async function initDatabase() {
  // 创建数据目录
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 初始化 SQL.js
  const SQL = await initSqlJs();
  
  // 加载现有数据库或创建新的
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      source_type TEXT DEFAULT 'text',
      source_url TEXT,
      file_path TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_nodes (
      id TEXT PRIMARY KEY,
      base_id TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      difficulty INTEGER DEFAULT 1,
      estimated_minutes INTEGER DEFAULT 10,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (base_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      base_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      total_days INTEGER,
      daily_items INTEGER DEFAULT 3,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (base_id) REFERENCES knowledge_base(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS plan_items (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      node_id TEXT,
      day_number INTEGER NOT NULL,
      item_type TEXT DEFAULT 'learn',
      status TEXT DEFAULT 'pending',
      scheduled_date TEXT,
      completed_at TEXT,
      mastery_level INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES study_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      question_type TEXT DEFAULT 'choice',
      options TEXT,
      explanation TEXT,
      difficulty INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS learning_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      node_id TEXT,
      item_id TEXT,
      item_type TEXT,
      action TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      correct INTEGER DEFAULT 0,
      score INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      exercise_id TEXT,
      review_date TEXT NOT NULL,
      next_review TEXT NOT NULL,
      interval_days INTEGER DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      repetition INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      reviewed_at TEXT,
      quality INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      daily_goal INTEGER DEFAULT 60,
      reminder_time TEXT DEFAULT '09:00',
      theme TEXT DEFAULT 'light',
      ai_model TEXT DEFAULT 'auto',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 保存数据库
  saveDatabase();
  
  console.log('✅ 数据库初始化完成');
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// 封装常用的数据库操作
const dbWrapper = {
  prepare: (sql) => ({
    run: (...params) => {
      db.run(sql, params);
      saveDatabase();
      return { changes: db.getRowsModified() };
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all: (...params) => {
      const results = [];
      const stmt = db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  })
};

// 定时保存数据库
setInterval(() => saveDatabase(), 30000);

module.exports = { db: dbWrapper, initDatabase };
