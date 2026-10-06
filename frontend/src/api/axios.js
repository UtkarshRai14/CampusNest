import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const API = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  res => res,
  err => {
    // A 401 ends the session only if the request carried the current token. A failed login
    // (no token sent) or a late response for an old session must not log the user out.
    const sentWith = err.config?.headers?.Authorization
    if (err.response?.status === 401 && sentWith && sentWith === `Bearer ${localStorage.getItem('token')}`) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default API
