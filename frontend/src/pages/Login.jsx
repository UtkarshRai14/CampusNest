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
      else if (err.message === 'Network Error') toast.error('Backend offline!')
      else toast.error('Login failed')
    } finally { setLoading(false) }
  }

  const filteredSuggestions = savedEmails.filter(e =>
    e.includes(form.email.toLowerCase()) && e !== form.email
  )

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
            <input type="email" placeholder="your@email.com"
              value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
              onFocus2={e => e.target.style.borderColor = '#00C9B1'}
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
                    style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'background 0.15s', borderBottom: i < savedEmails.length - 1 ? '1px solid #F0F8F6' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FFFE'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00C9B1, #00A896)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
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

          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#E0F0EC' }} />
            <span style={{ color: '#A0BCBB', fontSize: 13 }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: '#E0F0EC' }} />
          </div>

          
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast('💡 Enter your Gmail address above! e.g. yourname@gmail.com', { duration: 3000 })}
            style={{ width: '100%', padding: '13px', borderRadius: 10, border: '1.5px solid #E0ECF0', background: '#fff', color: '#0D2B35', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>
        </div>

        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '24px 0 16px' }}>
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
