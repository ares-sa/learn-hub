import { useState, useEffect } from 'react'
import { review, learn } from '../utils/api'

export default function Review() {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentReview, setCurrentReview] = useState(null)
  const [exercises, setExercises] = useState([])
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [reviewsData, statsData, scheduleData] = await Promise.all([
        review.todayList(),
        review.stats(),
        review.schedule()
      ])
      setReviews(reviewsData)
      setStats(statsData)
      setSchedule(scheduleData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const startReview = async (item) => {
    setCurrentReview(item)
    try {
      const exs = await review.getExercises(item.node_id)
      setExercises(exs)
      setAnswers({})
    } catch (e) {
      alert('获取复习题失败')
    }
  }

  const submitReview = async (quality) => {
    try {
      const result = await review.submit({
        nodeId: currentReview.node_id,
        quality
      })
      alert(`复习完成！下次复习: ${result.nextReview} (${result.interval}天后)`)
      setCurrentReview(null)
      loadData()
    } catch (e) {
      alert('提交失败')
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  // 复习答题模式
  if (currentReview) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <button className="btn btn-secondary" onClick={() => setCurrentReview(null)}>← 返回</button>
        <h2 style={{ marginTop: '1rem', marginBottom: '1rem' }}>复习: {currentReview.node_title}</h2>
        
        {exercises.length > 0 ? (
          <>
            {exercises.map((ex, i) => (
              <div key={ex.id} className="question-card">
                <div className="question-text">{i + 1}. {ex.question}</div>
                <div className="options">
                  {JSON.parse(ex.options || '[]').map((opt, j) => (
                    <div
                      key={j}
                      className={`option ${answers[ex.id] === opt ? 'selected' : ''}`}
                      onClick={() => setAnswers({ ...answers, [ex.id]: opt })}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '1rem', fontWeight: 500 }}>回忆程度：</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-danger" onClick={() => submitReview(1)}>完全忘记</button>
                <button className="btn btn-warning" style={{ background: '#f59e0b', color: 'white' }} onClick={() => submitReview(2)}>印象模糊</button>
                <button className="btn btn-primary" onClick={() => submitReview(3)}>记得一点</button>
                <button className="btn btn-success" onClick={() => submitReview(4)}>基本记住</button>
                <button className="btn" style={{ background: '#10b981', color: 'white' }} onClick={() => submitReview(5)}>完全记住</button>
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ marginTop: '1rem' }}>
            <p>暂无练习题，直接评估记忆程度：</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-danger" onClick={() => submitReview(1)}>忘记</button>
              <button className="btn btn-primary" onClick={() => submitReview(3)}>记得</button>
              <button className="btn btn-success" onClick={() => submitReview(5)}>完全记住</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>🔄 复习中心</h1>

      {/* 统计 */}
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats?.pendingCount || 0}</div>
          <div className="stat-label">待复习</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.todayReviewed || 0}</div>
          <div className="stat-label">今日已复习</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.todayPassed || 0}</div>
          <div className="stat-label">今日通过</div>
        </div>
      </div>

      {/* 待复习列表 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>📋 今日待复习</h3>
        {reviews.length > 0 ? (
          <div className="list">
            {reviews.map(item => (
              <div key={item.id} className="list-item">
                <div>
                  <div className="list-item-title">{item.node_title}</div>
                  <div className="list-item-desc">间隔: {item.interval_days}天 · 重复: {item.repetition}次</div>
                </div>
                <button className="btn btn-primary" onClick={() => startReview(item)}>开始复习</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">🎉 今日暂无待复习内容！</div>
        )}
      </div>

      {/* 未来复习安排 */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>📅 未来复习安排</h3>
        {schedule.length > 0 ? (
          <div className="list">
            {schedule.map(item => (
              <div key={item.date} className="list-item">
                <div>{item.date}</div>
                <span className="tag tag-primary">{item.count} 项</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">暂无复习安排</div>
        )}
      </div>
    </div>
  )
}
