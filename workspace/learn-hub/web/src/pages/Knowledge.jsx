import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { knowledge } from '../utils/api'

export default function Knowledge() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', sourceType: 'text' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadList()
  }, [])

  const loadList = async () => {
    try {
      const data = await knowledge.list()
      setList(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await knowledge.create(form)
      setShowForm(false)
      setForm({ title: '', content: '', sourceType: 'text' })
      loadList()
    } catch (e) {
      alert(e.error || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除此知识库？')) return
    try {
      await knowledge.delete(id)
      loadList()
    } catch (e) {
      alert(e.error || '删除失败')
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <h1>📚 知识库</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '+ 添加知识'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>添加新知识</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">标题</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">知识内容</label>
              <textarea
                className="form-textarea"
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="输入要学习的内容，AI会自动解析并生成知识点..."
              />
            </div>
            <button className="btn btn-primary" disabled={submitting}>
              {submitting ? 'AI解析中...' : '创建并解析'}
            </button>
          </form>
        </div>
      )}

      {list.length > 0 ? (
        <div className="list">
          {list.map(item => (
            <div key={item.id} className="list-item">
              <div style={{ flex: 1 }}>
                <Link to={`/knowledge/${item.id}`} className="list-item-title">{item.title}</Link>
                <div className="list-item-desc">
                  {item.node_count || 0} 个知识点 · 
                  <span className={`tag ${item.status === 'ready' ? 'tag-success' : item.status === 'error' ? 'tag-warning' : 'tag-primary'}`} style={{ marginLeft: '0.5rem' }}>
                    {item.status === 'ready' ? '已就绪' : item.status === 'error' ? '解析失败' : '处理中'}
                  </span>
                </div>
              </div>
              <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>删除</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>还没有知识库</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>点击上方"添加知识"开始创建</p>
        </div>
      )}
    </div>
  )
}
