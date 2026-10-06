import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

export default function Login() {
  const isMobile = window.innerWidth < 768
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savedEmails, setSavedEmails] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const emails = JSON.parse(localStorage.getItem('saved_emails') || '[]')
    setSavedEmails(emails)

    if (emails.length > 0) {
      setForm(f => ({ ...f, email: emails[0] }))
    }
  }, [])

  const saveEmail = (email) => {
    const existing = JSON.parse(localStorage.getItem('saved_emails') || '[]')
    const updated = [email, ...existing.filter(e => e !== email)].slice(0, 5)
    localStorage.setItem('saved_emails', JSON.stringify(updated))
    setSavedEmails(updated)
  }

  const handleSubmit = async () => {
    if (!form.email) { toast.error('Enter your email'); return }
    if (!form.password) { toast.error('Enter your password'); return }
    setLoading(true)
    try {
      const res = await API.post('/users/login', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      const { access_token, user } = res.data
      login(user, access_token)
      saveEmail(form.email.trim().toLowerCase())
      toast.success('Welcome back, ' + user.name + '! 🎓')
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') toast.error(detail)
      else if (err.message === 'Network Error') toast.error('Could not reach the server. Please try again in a minute.')
      else toast.error('Login failed')
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: isMobile ? '8px 12px' : '12px 16px', borderRadius: 10,
    border: '1.5px solid #D0ECE8', outline: 'none', fontSize: isMobile ? 13 : 15,
    color: '#0D2B35', background: '#F8FFFE', boxSizing: 'border-box',
    transition: 'border 0.2s', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: 'unset', background: 'linear-gradient(160deg, #FFFFFF 0%, #E8FDFB 50%, #D0F8F3 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: isMobile ? '12px 16px' : '40px 20px', paddingTop: isMobile ? '12px' : '40px' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#fff', borderRadius: 24, padding: isMobile ? '24px 20px' : '48px 44px', boxShadow: '0 8px 40px rgba(0,201,177,0.12)', border: '1px solid #D0F5F0', width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: isMobile ? 16 : 32 }}>
          <div style={{ fontSize: isMobile ? 28 : 40, marginBottom: isMobile ? 4 : 8 }}>🎓</div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0D2B35', marginBottom: 6 }}>Welcome Back</h1>
          <p style={{ color: '#7A9BA8', fontSize: 14 }}>Sign in to your CampusNest account</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 18 }}>

          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4A6572', display: 'block', marginBottom: 6 }}>Email Address</label>
            <input type="email" placeholder="yourname@iiitsonepat.ac.in"
              value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setShowSuggestions(true) }}
              onFocus={e => { setShowSuggestions(true); e.target.style.borderColor = '#00C9B1' }}
              onBlur={e => { e.target.style.borderColor = '#D0ECE8'; setTimeout(() => setShowSuggestions(false), 150) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
            />

            {showSuggestions && savedEmails.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 12, border: '1.5px solid #D0ECE8', boxShadow: '0 8px 24px rgba(0,201,177,0.15)', zIndex: 100, overflow: 'hidden', marginTop: 4 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #E0F5F0', fontSize: 11, color: '#A0BCBB', fontWeight: 700, letterSpacing: 0.5 }}>
                  🕐 RECENTLY USED
                </div>
                {savedEmails.map((email, i) => (
                  <div key={i}
                    onClick={() => { setForm(f => ({ ...f, email })); setShowSuggestions(false) }}
                    style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s', borderBottom: i < savedEmails.length - 1 ? '1px solid #F0F8F6' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FFFE'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00C9B1, #00A896)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {email[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0D2B35' }}>{email}</div>
                      <div style={{ fontSize: 11, color: '#A0BCBB' }}>Tap to fill</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 18, color: '#D0ECE8' }}>→</span>
                  </div>
                ))}
                <div style={{ padding: '8px 16px', borderTop: '1px solid #E0F5F0' }}>
                  <button onClick={() => { localStorage.removeItem('saved_emails'); setSavedEmails([]); setShowSuggestions(false) }}
                    style={{ background: 'none', border: 'none', color: '#E05555', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    🗑️ Clear saved emails
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#4A6572', display: 'block', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = '#00C9B1'}
                onBlur={e => e.target.style.borderColor = '#D0ECE8'}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                color: '#7A9BA8', padding: 0, display: 'flex', alignItems: 'center',
              }}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <motion.button onClick={handleSubmit} disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
            style={{ width: '100%', padding: isMobile ? '10px' : '14px', borderRadius: 10, border: 'none', background: loading ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 6px 20px rgba(0,201,177,0.35)', marginTop: 4 }}>
            {loading ? '⏳ Signing in...' : 'Sign In →'}
          </motion.button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: '#E0F0EC' }} />
          <span style={{ color: '#A0BCBB', fontSize: 13 }}>New to CampusNest?</span>
          <div style={{ flex: 1, height: 1, background: '#E0F0EC' }} />
        </div>

        <Link to="/register" style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 10, border: '1.5px solid #00C9B1', color: '#00A896', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
          Create Account
        </Link>
      </motion.div>
    </div>
  )
}
