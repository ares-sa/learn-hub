import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// 请求拦截器
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
API.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// 认证
export const auth = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me')
};

// 知识库
export const knowledge = {
  list: () => API.get('/knowledge'),
  get: (id) => API.get(`/knowledge/${id}`),
  create: (data) => API.post('/knowledge', data),
  update: (id, data) => API.put(`/knowledge/${id}`, data),
  delete: (id) => API.delete(`/knowledge/${id}`),
  reparse: (id) => API.post(`/knowledge/${id}/parse`)
};

// 学习计划
export const plans = {
  list: () => API.get('/plan'),
  get: (id) => API.get(`/plan/${id}`),
  create: (data) => API.post('/plan', data),
  update: (id, data) => API.patch(`/plan/${id}`, data),
  delete: (id) => API.delete(`/plan/${id}`),
  todayTasks: () => API.get('/plan/today/tasks')
};

// 学习
export const learn = {
  recordLearn: (nodeId, data) => API.post(`/learn/learn/${nodeId}`, data),
  getExercises: (nodeId, count = 5) => API.get(`/learn/exercises/${nodeId}?count=${count}`),
  submitExercises: (data) => API.post('/learn/exercises/submit', data),
  submitTest: (nodeId, data) => API.post(`/learn/test/${nodeId}`, data)
};

// 复习
export const review = {
  todayList: () => API.get('/review/today'),
  getExercises: (nodeId) => API.get(`/review/exercises/${nodeId}`),
  submit: (data) => API.post('/review/submit', data),
  stats: () => API.get('/review/stats'),
  schedule: () => API.get('/review/schedule')
};

// 统计
export const stats = {
  overview: () => API.get('/stats/overview'),
  trend: (days = 7) => API.get(`/stats/trend?days=${days}`),
  progress: () => API.get('/stats/progress'),
  activity: (limit = 10) => API.get(`/stats/activity?limit=${limit}`)
};

export default API;
