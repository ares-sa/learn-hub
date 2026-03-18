import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { stats, plans, review } from '../utils/api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [todayTasks, setTodayTasks] = useState([])
  const [todayReviews, setTodayReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, tasksData, reviewsData] = await Promise.all([
        stats.overview(),
        plans.todayTasks(),
        review.todayList()
      ])
      setData(statsData)
      setTodayTasks(tasksData.slice(0, 5))
      setTodayReviews(reviewsData.slice(0, 3))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>欢迎回来！👋</h1>

      {/* 统计概览 */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{data?.knowledgeBases || 0}</div>
          <div className="stat-label">知识库</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.knowledgeNodes || 0}</div>
          <div className="stat-label">知识点</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.todayMinutes || 0}分钟</div>
          <div className="stat-label">今日学习</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.completionRate || 0}%</div>
          <div className="stat-label">计划完成率</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* 今日任务 */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📚 今日任务</h3>
            <Link to="/today" className="btn btn-secondary">查看全部</Link>
          </div>
          {todayTasks.length > 0 ? (
            <div className="list">
              {todayTasks.map(task => (
                <Link key={task.id} to={`/plans/${task.plan_id}`} className="list-item">
                  <div>
                    <div className="list-item-title">{task.node_title || '学习任务'}</div>
                    <div className="list-item-desc">{task.item_type === 'learn' ? '学习' : task.item_type === 'practice' ? '练习' : '测验'}</div>
                  </div>
                  <span className={`tag ${task.status === 'completed' ? 'tag-success' : 'tag-primary'}`}>
                    {task.status === 'completed' ? '已完成' : '待完成'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">暂无今日任务</div>
          )}
        </div>

        {/* 复习提醒 */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔄 待复习</h3>
            <Link to="/review" className="btn btn-secondary">开始复习</Link>
          </div>
          {todayReviews.length > 0 ? (
            <div className="list">
              {todayReviews.map(r => (
                <Link key={r.id} to="/review" className="list-item">
                  <div>
                    <div className="list-item-title">{r.node_title}</div>
                    <div className="list-item-desc">间隔: {r.interval_days}天</div>
                  </div>
                  <span className="tag tag-warning">复习</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">暂无待复习内容 🎉</div>
          )}
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>⚡ 快捷操作</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/knowledge" className="btn btn-primary">+ 添加知识库</Link>
          <Link to="/plans" className="btn btn-secondary">创建学习计划</Link>
          <Link to="/stats" className="btn btn-secondary">查看学习统计</Link>
        </div>
      </div>
    </div>
  )
}
