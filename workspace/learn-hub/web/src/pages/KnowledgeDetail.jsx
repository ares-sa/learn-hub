import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { knowledge, plans } from '../utils/api'

export default function KnowledgeDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [planForm, setPlanForm] = useState({ title: '', days: 7, dailyItems: 3 })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const result = await knowledge.get(id)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const plan = await plans.create({
        baseId: id,
        ...planForm
      })
      alert('学习计划创建成功！')
      setShowPlanForm(false)
    } catch (e) {
      alert(e.error || '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleReparse = async () => {
    try {
      await knowledge.reparse(id)
      alert('已重新解析')
      loadData()
    } catch (e) {
      alert(e.error || '解析失败')
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <Link to="/knowledge" style={{ color: 'var(--gray-500)', textDecoration: 'none' }}>← 返回知识库</Link>
      
      <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <h1>{data?.title}</h1>
        <p style={{ color: 'var(--gray-500)', marginTop: '0.5rem' }}>{data?.content?.slice(0, 200)}...</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📖 知识点 ({data?.nodes?.length || 0})</h3>
            <button className="btn btn-secondary" onClick={handleReparse}>重新解析</button>
          </div>
          {data?.nodes?.length > 0 ? (
            <div className="list">
              {data.nodes.map((node, i) => (
                <div key={node.id} className="list-item">
                  <div>
                    <div className="list-item-title">{i + 1}. {node.title}</div>
                    <div className="list-item-desc">难度: {'⭐'.repeat(node.difficulty)} · 约{node.estimated_minutes}分钟</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">暂无知识点</div>
          )}
        </div>

        <div>
          <div className="card">
            <h3 className="card-title">📅 创建学习计划</h3>
            {!showPlanForm ? (
              <button className="btn btn-primary" onClick={() => setShowPlanForm(true)}>
                生成学习计划
              </button>
            ) : (
              <form onSubmit={handleCreatePlan}>
                <div className="form-group">
                  <label className="form-label">计划标题</label>
                  <input
                    className="form-input"
                    value={planForm.title}
                    onChange={e => setPlanForm({ ...planForm, title: e.target.value })}
                    placeholder="自定义计划名称"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">计划天数</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max="30"
                    value={planForm.days}
                    onChange={e => setPlanForm({ ...planForm, days: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">每日任务数</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max="10"
                    value={planForm.dailyItems}
                    onChange={e => setPlanForm({ ...planForm, dailyItems: parseInt(e.target.value) })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" type="submit" disabled={creating}>
                    {creating ? '创建中...' : '确认创建'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setShowPlanForm(false)}>取消</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
