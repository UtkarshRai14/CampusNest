import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import API from '../api/axios'

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #D0ECE8',
  outline: 'none', fontSize: 15, color: '#0D2B35', background: '#F8FFFE', boxSizing: 'border-box',
}

export default function PasswordReset() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (token) {
      if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
      if (new TextEncoder().encode(password).length > 72) { toast.error('Password must be at most 72 UTF-8 bytes'); return }
      if (password !== confirm) { toast.error('Passwords do not match'); return }
    }
    setLoading(true)
    try {
      const response = token
        ? await API.post('/users/reset-password', { token, password })
        : await API.post('/users/forgot-password', { email: email.trim().toLowerCase() })
      toast.success(response.data.message)
      if (token) navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not complete the request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '70vh', background: 'linear-gradient(160deg, #FFFFFF 0%, #E8FDFB 50%, #D0F8F3 100%)', display: 'flex', justifyContent: 'center', padding: '48px 20px' }}>
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#fff', borderRadius: 24, padding: '40px 36px', border: '1px solid #D0F5F0', boxShadow: '0 8px 40px rgba(0,201,177,0.12)', width: '100%', maxWidth: 440, alignSelf: 'flex-start' }}>
        <h1 style={{ fontSize: 25, fontWeight: 900, color: '#0D2B35', marginBottom: 8 }}>{token ? 'Choose a new password' : 'Reset your password'}</h1>
        <p style={{ color: '#7A9BA8', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
          {token ? 'Use at least 8 characters. Passwords are limited to 72 UTF-8 bytes.' : 'Enter your college email. If an account exists, reset instructions will be sent.'}
        </p>
        {token ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <input type="password" autoComplete="new-password" aria-label="New password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
            <input type="password" autoComplete="new-password" aria-label="Confirm password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} required />
          </div>
        ) : (
          <input type="email" autoComplete="email" aria-label="College email" placeholder="yourname@iiitsonepat.ac.in" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
        )}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, marginTop: 18, border: 0, borderRadius: 10, background: loading ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Please wait…' : token ? 'Update password' : 'Send reset link'}
        </button>
        <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: 18, color: '#00A896', textDecoration: 'none', fontWeight: 600 }}>Back to login</Link>
      </motion.form>
    </div>
  )
}
