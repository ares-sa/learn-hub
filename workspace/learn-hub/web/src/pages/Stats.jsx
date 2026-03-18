import { useState, useEffect } from 'react'
import { stats } from '../utils/api'
import dayjs from 'dayjs'

export default function Stats() {
  const [overview, setOverview] = useState(null)
  const [trend, setTrend] = useState([])
  const [progress, setProgress] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [overviewData, trendData, progressData, activityData] = await Promise.all([
        stats.overview(),
        stats.trend(14),
        stats.progress(),
        stats.activity(20)
      ])
      setOverview(overviewData)
      setTrend(trendData)
      setProgress(progressData)
      setActivity(activityData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>📊 学习统计</h1>

      {/* 概览统计 */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value">{overview?.knowledgeBases || 0}</div>
          <div className="stat-label">知识库</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview?.knowledgeNodes || 0}</div>
          <div className="stat-label">知识点</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview?.todayMinutes || 0}</div>
          <div className="stat-label">今日分钟</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview?.weekActiveDays || 0}</div>
          <div className="stat-label">本周学习天数</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* 学习趋势 */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>📈 学习趋势 (14天)</h3>
          {trend.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '150px' }}>
              {trend.map((day, i) => {
                const maxMinutes = Math.max(...trend.map(d => d.minutes || 0), 60)
                const height = day.minutes ? (day.minutes / maxMinutes * 100) : 0
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div 
                      style={{ 
                        width: '100%', 
                        background: 'var(--primary)', 
                        borderRadius: '4px 4px 0 0',
                        height: `${Math.max(height, 4)}%`,
                        minHeight: '4px'
                      }} 
                      title={`${day.date}: ${day.minutes || 0}分钟`}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '4px' }}>
                      {day.date.slice(-5)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty">暂无数据</div>
          )}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            <span>📚 {trend.reduce((sum, d) => sum + (d.actions || 0), 0)} 次学习</span>
            <span>✅ {trend.reduce((sum, d) => sum + (d.correct || 0), 0)} 正确</span>
          </div>
        </div>

        {/* 知识库进度 */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>📚 知识库进度</h3>
          {progress.length > 0 ? (
            <div className="list">
              {progress.map(item => {
                const pct = item.nodes ? Math.round((item.completed / item.nodes) * 100) : 0
                return (
                  <div key={item.id} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span className="list-item-title">{item.title}</span>
                      <span style={{ color: 'var(--gray-500)' }}>{item.completed}/{item.nodes}</span>
                    </div>
                    <div className="progress">
                      <div className="progress-bar" style={{ width: `${pct}%` }} />
                    </div>
                    {item.mastery > 0 && (
                      <span className="tag" style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                        掌握度: {item.mastery}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty">暂无知识库</div>
          )}
        </div>
      </div>

      {/* 最近活动 */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>🕐 最近活动</h3>
        {activity.length > 0 ? (
          <div className="list">
            {activity.map(item => (
              <div key={item.id} className="list-item">
                <div>
                  <div className="list-item-title">{item.node_title || '学习记录'}</div>
                  <div className="list-item-desc">
                    {item.action === 'learn' && '📖 学习'}
                    {item.action === 'practice' && '📝 练习'}
                    {item.action === 'test' && '🧪 测验'}
                    {item.action === 'review' && '🔄 复习'}
                    {' · '}{dayjs(item.created_at).format('MM-DD HH:mm')}
                  </div>
                </div>
                {item.score > 0 && (
                  <span className={`tag ${item.correct ? 'tag-success' : 'tag-warning'}`}>
                    {item.score}分
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">暂无活动记录</div>
        )}
      </div>
    </div>
  )
}
