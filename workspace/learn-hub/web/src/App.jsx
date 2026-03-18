import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { auth } from './utils/api'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Knowledge from './pages/Knowledge'
import KnowledgeDetail from './pages/KnowledgeDetail'
import Plans from './pages/Plans'
import PlanDetail from './pages/PlanDetail'
import TodayTasks from './pages/TodayTasks'
import Review from './pages/Review'
import Stats from './pages/Stats'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const userData = await auth.me()
      setUser(userData)
    } catch (e) {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="app">
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/knowledge" element={user ? <Knowledge /> : <Navigate to="/login" />} />
        <Route path="/knowledge/:id" element={user ? <KnowledgeDetail /> : <Navigate to="/login" />} />
        <Route path="/plans" element={user ? <Plans /> : <Navigate to="/login" />} />
        <Route path="/plans/:id" element={user ? <PlanDetail /> : <Navigate to="/login" />} />
        <Route path="/today" element={user ? <TodayTasks /> : <Navigate to="/login" />} />
        <Route path="/review" element={user ? <Review /> : <Navigate to="/login" />} />
        <Route path="/stats" element={user ? <Stats /> : <Navigate to="/login" />} />
      </Routes>
    </div>
  )
}

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">🧠 记忆工坊</Link>
        <div className="nav-links">
          <Link to="/">首页</Link>
          <Link to="/knowledge">知识库</Link>
          <Link to="/plans">学习计划</Link>
          <Link to="/today">今日任务</Link>
          <Link to="/review">复习</Link>
          <Link to="/stats">统计</Link>
        </div>
        <div className="user-info">
          <span>{user.username}</span>
          <button className="btn btn-secondary" onClick={onLogout}>退出</button>
        </div>
      </div>
    </nav>
  )
}

export default App
