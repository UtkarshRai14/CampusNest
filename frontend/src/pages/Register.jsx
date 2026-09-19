import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

export default function Register() {
  const isMobile = window.innerWidth < 768
  const [step, setStep] = useState(1)
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    school_id: '', school_name: '', department: '', semester: '', enrollment_no: '',
  })
  const { login } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    API.get('/categories/schools')
      .then(r => {
        const data = r.data
        const schoolList = Array.isArray(data) ? data : data.schools || []
        setSchools(schoolList)
      })
      .catch(() => toast.error('Connecting to server, please wait a moment ⏳'))
      .finally(() => setSchoolsLoading(false))
  }, [])

  useEffect(() => {
    if (form.school_id) {
      const school = schools.find(s => s.id == form.school_id)
      setDepartments(school?.departments || [])
      setForm(f => ({ ...f, department: '', school_name: school?.name || '' }))
    }
  }, [form.school_id, schools])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.school_id) { toast.error('Please select your school'); return }
    if (!form.department) { toast.error('Please select your department'); return }
    if (!form.semester) { toast.error('Please select your semester'); return }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      
      school: form.school_name,
      department: form.department,
      semester: parseInt(form.semester),
      enrollment_no: form.enrollment_no.trim() || null,
    }

    console.log('Registering with:', payload)
    setLoading(true)

    try {
      const res = await API.post('/users/register', payload)
      console.log('Response:', res.data)

      const userData = res.data.user || res.data
      const token = res.data.access_token || res.data.token

      if (!token) {
        toast.error('Account created! Please login.')
        navigate('/login')
        return
      }

      login(userData, token)
      toast.success('Welcome to CampusNest! 🎓')
      navigate('/')
    } catch (err) {
      console.error('Error:', err.response?.data)
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        toast.error(detail)
      } else if (Array.isArray(detail)) {
        toast.error(detail.map(d => d.msg).join(', '))
      } else if (err.message === 'Network Error') {
        toast.error('Server is busy, please try again in a moment ⏳')
      } else {
        toast.error('Registration failed — check console')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: isMobile ? '8px 12px' : '12px 16px', borderRadius: 10,
    border: '1.5px solid #D0ECE8', outline: 'none', fontSize: isMobile ? 13 : 15,
    color: '#0D2B35', background: '#F8FFFE', boxSizing: 'border-box',
    transition: 'border 0.2s', fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#4A6572', display: 'block', marginBottom: 6 }

  return (
    <div style={{
      minHeight: 'unset',
      background: 'linear-gradient(160deg, #FFFFFF 0%, #E8FDFB 50%, #D0F8F3 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '12px 16px' : '40px 20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#fff', borderRadius: 24, padding: isMobile ? '24px 20px' : '48px 44px',
          boxShadow: '0 8px 40px rgba(0,201,177,0.12)',
          border: '1px solid #D0F5F0', width: '100%', maxWidth: 480,
        }}
      >
        
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 16 : 32 }}>
          <div style={{ fontSize: isMobile ? 28 : 40, marginBottom: isMobile ? 4 : 8 }}>🎓</div>
          <h1 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, color: '#0D2B35', marginBottom: 4 }}>Join CampusNest</h1>
          <p style={{ color: '#7A9BA8', fontSize: 14 }}>IIIT Sonepat Students Only</p>
        </div>

        
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 5, borderRadius: 4,
              background: step >= s ? 'linear-gradient(90deg, #00C9B1, #00A896)' : '#E0F0EC',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        <p style={{ color: '#A0BCBB', fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: 0.5 }}>
          STEP {step} OF 2 — {step === 1 ? 'PERSONAL DETAILS' : 'ACADEMIC DETAILS'}
        </p>

        
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 16 }}>

            <div>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} placeholder="Aditi Sharma"
                value={form.name} onChange={e => update('name', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#00C9B1'}
                onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
            </div>

            <div>
              <label style={labelStyle}>Email Address *</label>
              <input style={inputStyle} type="email" placeholder="your@email.com"
                value={form.email} onChange={e => update('email', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#00C9B1'}
                onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
            </div>

            <div>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 44 }} type={showPassword ? "text" : "password"} placeholder="Minimum 6 characters"
                  value={form.password} onChange={e => update('password', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
                <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                  color: '#7A9BA8', padding: 0, display: 'flex', alignItems: 'center',
                }}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 44 }} type={showConfirm ? "text" : "password"} placeholder="Repeat password"
                  value={form.confirm} onChange={e => update('confirm', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
                <button type="button" onClick={() => setShowConfirm(s => !s)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                  color: '#7A9BA8', padding: 0, display: 'flex', alignItems: 'center',
                }}>{showConfirm ? '🙈' : '👁️'}</button>
              </div>
              {form.confirm && (
                <p style={{ fontSize: 12, marginTop: 4, color: form.password === form.confirm ? '#00A896' : '#E05555' }}>
                  {form.password === form.confirm ? '✅ Passwords match' : '⚠️ Passwords do not match'}
                </p>
              )}
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (!form.name.trim()) { toast.error('Enter your name'); return }
                if (!form.email.trim()) { toast.error('Enter your email'); return }
                if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
                if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
                setStep(2)
              }}
              style={{
                width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,201,177,0.35)', marginTop: 4,
              }}>Next →</motion.button>
          </motion.div>
        )}

        
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 16 }}>

            <div>
              <label style={labelStyle}>Enrollment Number</label>
              <input style={inputStyle} placeholder="Your enrollment / roll number"
                value={form.enrollment_no} onChange={e => update('enrollment_no', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#00C9B1'}
                onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
            </div>

            <div>
              <label style={labelStyle}>School *</label>
              {schoolsLoading ? (
                <div style={{ ...inputStyle, color: '#7A9BA8' }}>Loading schools...</div>
              ) : (
                <select style={{ ...inputStyle, cursor: 'pointer' }}
                  value={form.school_id} onChange={e => update('school_id', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'}>
                  <option value="">Select your school</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={labelStyle}>Department / Course *</label>
              <select
                style={{ ...inputStyle, cursor: form.school_id ? 'pointer' : 'not-allowed', opacity: form.school_id ? 1 : 0.6 }}
                value={form.department}
                onChange={e => update('department', e.target.value)}
                disabled={!form.school_id}
                onFocus={e => e.target.style.borderColor = '#00C9B1'}
                onBlur={e => e.target.style.borderColor = '#D0ECE8'}>
                <option value="">{form.school_id ? 'Select department' : 'Select school first'}</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Current Semester *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.semester} onChange={e => update('semester', e.target.value)}
                onFocus={e => e.target.style.borderColor = '#00C9B1'}
                onBlur={e => e.target.style.borderColor = '#D0ECE8'}>
                <option value="">Select semester</option>
                {[1,2,3,4,5,6,7,8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: '13px', borderRadius: 10,
                border: '1.5px solid #D0ECE8', background: '#fff',
                color: '#4A6572', fontWeight: 600, cursor: 'pointer',
              }}>← Back</button>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSubmit} disabled={loading}
                style={{
                  flex: 2, padding: '13px', borderRadius: 10, border: 'none',
                  background: loading ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(0,201,177,0.35)',
                }}>
                {loading ? '⏳ Creating Account...' : '🎓 Create Account'}
              </motion.button>
            </div>
          </motion.div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <span style={{ color: '#7A9BA8', fontSize: 14 }}>Already have an account? </span>
          <Link to="/login" style={{ color: '#00A896', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </motion.div>
    </div>
  )
}
