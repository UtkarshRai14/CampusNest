import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Fired when a request is still running after SLOW_REQUEST_MS. The server may have gone to
// sleep (free hosting), so ServerStatusBanner checks it and explains the wait if so.
export const SLOW_REQUEST_EVENT = 'campusnest:slow-request'
const SLOW_REQUEST_MS = 5000

const API = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.slowTimer = setTimeout(() => window.dispatchEvent(new Event(SLOW_REQUEST_EVENT)), SLOW_REQUEST_MS)
  return config
})

API.interceptors.response.use(
  res => {
    clearTimeout(res.config.slowTimer)
    return res
  },
  err => {
    clearTimeout(err.config?.slowTimer)
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
