import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { plans } from '../utils/api'

export default function TodayTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const data = await plans.todayTasks()
      setTasks(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>📚 今日任务</h1>

      {tasks.length > 0 ? (
        <div className="list">
          {tasks.map(task => (
            <div key={task.id} className="list-item">
              <div style={{ flex: 1 }}>
                <div className="list-item-title">{task.node_title || '学习任务'}</div>
                <div className="list-item-desc">
                  计划: {task.plan_title} · 
                  {task.item_type === 'learn' ? ' 学习' : task.item_type === 'practice' ? ' 练习' : ' 测验'}
                </div>
              </div>
              <Link to={`/plans/${task.plan_id}`} className="btn btn-primary">
                {task.status === 'completed' ? '查看' : '开始'}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>🎉 今日任务已完成！</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>可以回顾一下今天学了什么</p>
          <Link to="/knowledge" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            添加新知识
          </Link>
        </div>
      )}
    </div>
  )
}
