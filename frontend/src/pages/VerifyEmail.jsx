import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import API from '../api/axios'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('resend')
      setMessage('Check your inbox for the verification link. You can request a new link below.')
      return
    }
    API.get('/users/verify-email', { params: { token } })
      .then(res => { setStatus('success'); setMessage(res.data.message) })
      .catch(err => { setStatus('resend'); setMessage(err.response?.data?.detail || 'This verification link is invalid or expired.') })
  }, [searchParams])

  const resend = async () => {
    if (!email.trim()) { toast.error('Enter your college email'); return }
    setSending(true)
    try {
      const res = await API.post('/users/resend-verification', { email: email.trim().toLowerCase() })
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not resend the verification email')
    } finally { setSending(false) }
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(160deg, #FFFFFF 0%, #E8FDFB 100%)' }}>
      <div style={{ background: '#fff', border: '1px solid #D0F5F0', borderRadius: 24, padding: 40, width: '100%', maxWidth: 460, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,201,177,0.12)' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>{status === 'success' ? '✅' : '✉️'}</div>
        <h1 style={{ color: '#0D2B35', fontSize: 24, marginBottom: 10 }}>{status === 'success' ? 'Email verified' : 'Verify your email'}</h1>
        <p style={{ color: '#4A6572', lineHeight: 1.6 }}>{message || 'Check your inbox for the verification link.'}</p>
        {status === 'resend' && (
          <>
            <input type="email" placeholder="yourname@iiitsonepat.ac.in" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: 12, marginTop: 18, borderRadius: 10, border: '1.5px solid #D0ECE8', boxSizing: 'border-box' }} />
            <button onClick={resend} disabled={sending} style={{ width: '100%', padding: 13, marginTop: 12, border: 'none', borderRadius: 10, background: '#00A896', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {sending ? 'Sending…' : 'Resend verification email'}
            </button>
          </>
        )}
        <Link to="/login" style={{ display: 'inline-block', marginTop: 22, color: '#00A896', fontWeight: 700 }}>Go to login</Link>
      </div>
    </div>
  )
}
