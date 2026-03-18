import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { plans, learn } from '../utils/api'
import dayjs from 'dayjs'

export default function PlanDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTask, setCurrentTask] = useState(null)
  const [exercises, setExercises] = useState([])
  const [answers, setAnswers] = useState({})
  const [mode, setMode] = useState(null) // learn, practice, test

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const result = await plans.get(id)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const startLearn = (item) => {
    setCurrentTask(item)
    setMode('learn')
  }

  const startPractice = async (item) => {
    setCurrentTask(item)
    try {
      const exs = await learn.getExercises(item.node_id, 5)
      setExercises(exs)
      setAnswers({})
    } catch (e) {
      alert('获取练习题失败')
    }
    setMode('practice')
  }

  const submitPractice = async () => {
    const answerList = Object.entries(answers).map(([exerciseId, answer]) => ({
      exerciseId,
      correct: exercises.find(e => e.id === exerciseId)?.answer === answer
    }))
    
    try {
      const result = await learn.submitExercises({
        nodeId: currentTask.node_id,
        answers: answerList
      })
      alert(`练习完成！正确: ${result.correctCount}/${result.totalCount}，掌握度: ${result.masteryLevel}%`)
      setMode(null)
      setCurrentTask(null)
      loadData()
    } catch (e) {
      alert('提交失败')
    }
  }

  const finishLearn = async () => {
    try {
      await learn.recordLearn(currentTask.node_id, { duration: 300 })
      alert('学习记录已保存')
      setMode(null)
      setCurrentTask(null)
      loadData()
    } catch (e) {
      alert('保存失败')
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  // 学习模式
  if (mode === 'learn' && currentTask) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <button className="btn btn-secondary" onClick={() => { setMode(null); setCurrentTask(null) }}>← 返回</button>
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>{currentTask.node_title}</h2>
          <div style={{ margin: '1.5rem 0', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {currentTask.node_content}
          </div>
          <button className="btn btn-primary" onClick={finishLearn}>学完了，下一题</button>
        </div>
      </div>
    )
  }

  // 练习模式
  if (mode === 'practice' && currentTask) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <button className="btn btn-secondary" onClick={() => { setMode(null); setCurrentTask(null) }}>← 返回</button>
        <h2 style={{ marginTop: '1rem', marginBottom: '1rem' }}>练习: {currentTask.node_title}</h2>
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
        <button className="btn btn-primary" onClick={submitPractice}>提交答案</button>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <Link to="/plans" style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>← 返回计划列表</Link>
      
      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <h1>{data?.title}</h1>
        <p style={{ color: 'var(--gray-500)' }}>{data?.description}</p>
      </div>

      {/* 按天分组显示 */}
      {Array.from(new Set(data?.items?.map(i => i.day_number))).sort((a, b) => a - b).map(day => (
        <div key={day} className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Day {day}</h3>
          <div className="list">
            {data?.items?.filter(i => i.day_number === day).map(item => (
              <div key={item.id} className="list-item">
                <div>
                  <div className="list-item-title">{item.node_title}</div>
                  <div className="list-item-desc">
                    {item.item_type === 'learn' ? '📖 学习' : item.item_type === 'practice' ? '📝 练习' : '🧪 测验'}
                  </div>
                </div>
                <div>
                  {item.status === 'completed' ? (
                    <span className="tag tag-success">已完成</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {item.item_type === 'learn' && (
                        <button className="btn btn-primary" onClick={() => startLearn(item)}>学习</button>
                      )}
                      {(item.item_type === 'practice' || item.item_type === 'test') && (
                        <button className="btn btn-success" onClick={() => startPractice(item)}>
                          {item.item_type === 'practice' ? '练习' : '测验'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
