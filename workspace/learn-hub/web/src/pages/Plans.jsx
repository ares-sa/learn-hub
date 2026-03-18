import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { plans } from '../utils/api'

export default function Plans() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadList()
  }, [])

  const loadList = async () => {
    try {
      const data = await plans.list()
      setList(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此计划？')) return
    try {
      await plans.delete(id)
      loadList()
    } catch (e) {
      alert(e.error || '删除失败')
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <h1>📅 学习计划</h1>
      </div>

      {list.length > 0 ? (
        <div className="list">
          {list.map(plan => (
            <div key={plan.id} className="list-item">
              <div style={{ flex: 1 }}>
                <Link to={`/plans/${plan.id}`} className="list-item-title">{plan.title}</Link>
                <div className="list-item-desc">
                  {plan.base_title || '无关联知识库'} · 
                  {plan.completed_count || 0}/{plan.item_count || 0} 项完成
                </div>
                <div className="progress" style={{ marginTop: '0.5rem', width: '200px' }}>
                  <div 
                    className="progress-bar" 
                    style={{ width: `${plan.item_count ? (plan.completed_count / plan.item_count * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`tag ${plan.status === 'active' ? 'tag-success' : 'tag-warning'}`}>
                  {plan.status === 'active' ? '进行中' : '已暂停'}
                </span>
                <button className="btn btn-danger" onClick={() => handleDelete(plan.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>还没有学习计划</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>从知识库页面创建学习计划</p>
        </div>
      )}
    </div>
  )
}
