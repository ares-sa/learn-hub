import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { auth } from '../utils/api'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await auth.register(form)
      localStorage.setItem('token', token)
      navigate('/')
    } catch (e) {
      setError(e.error || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">注册</h1>
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              className="form-input"
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">邮箱（可选）</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--gray-500)' }}>
          已有账号？<Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  )
}
