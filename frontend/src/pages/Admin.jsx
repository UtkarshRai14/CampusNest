import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

const ADMIN_EMAILS = ['admin@campusnest.com']

export default function Admin() {
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !ADMIN_EMAILS.includes(user?.email)) {
      toast.error('Admin access only!')
      navigate('/')
      return
    }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, u, l] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/listings'),
      ])
      setStats(s.data)
      setUsers(u.data)
      setListings(l.data)
    } catch { toast.error('Failed to load admin data') }
    finally { setLoading(false) }
  }

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user and all their data?')) return
    try {
      await API.delete(`/admin/users/${id}`)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('User deleted')
    } catch { toast.error('Failed') }
  }

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return
    try {
      await API.delete(`/admin/listings/${id}`)
      setListings(prev => prev.filter(l => l.id !== id))
      toast.success('Listing deleted')
    } catch { toast.error('Failed') }
  }

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.enrollment_no?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredListings = listings.filter(l =>
    l.title?.toLowerCase().includes(search.toLowerCase())
  )

  const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#7A9BA8', letterSpacing: 0.5, borderBottom: '1px solid #E0F5F0' }
  const tdStyle = { padding: '14px 16px', fontSize: 14, color: '#0D2B35', borderBottom: '1px solid #F0F8F6' }

  return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0D2B35', marginBottom: 4 }}>
              👑 Admin Dashboard
            </h1>
            <p style={{ color: '#7A9BA8' }}>Welcome back, {user?.name} · Full platform control</p>
          </div>
          <button onClick={fetchAll} style={{
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #00C9B1, #00A896)',
            color: '#fff', fontWeight: 700, cursor: 'pointer',
          }}>🔄 Refresh</button>
        </motion.div>

        
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { icon: '👥', label: 'Total Users', value: stats.total_users, color: '#E8FBF8' },
              { icon: '📦', label: 'Total Listings', value: stats.total_listings, color: '#EBF5FF' },
              { icon: '💰', label: 'For Sale', value: stats.sell_listings, color: '#FFF8E8' },
              { icon: '🔑', label: 'For Rent', value: stats.rent_listings, color: '#F5EEFF' },
              { icon: '🤝', label: 'Borrow', value: stats.borrow_listings, color: '#E8FBF8' },
              { icon: '⚠️', label: 'Spam Flagged', value: stats.spam_flagged, color: '#FFF0F0' },
            ].map(s => (
              <motion.div key={s.label} whileHover={{ y: -4 }}
                style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #D0F5F0', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 10px' }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#7A9BA8', marginTop: 2 }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 6, border: '1px solid #D0F5F0', width: 'fit-content' }}>
          {[['stats', '📊 Overview'], ['users', '👥 Users'], ['listings', '📦 Listings']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setSearch('') }} style={{
              padding: '8px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === key ? 'linear-gradient(135deg, #00C9B1, #00A896)' : 'transparent',
              color: tab === key ? '#fff' : '#4A6572',
              fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        
        {tab !== 'stats' && (
          <input type="text" placeholder={`🔍 Search ${tab}...`}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              padding: '10px 18px', borderRadius: 10, marginBottom: 20,
              border: '1.5px solid #D0ECE8', outline: 'none',
              fontSize: 14, color: '#0D2B35', background: '#fff', width: 300,
            }}
            onFocus={e => e.target.style.borderColor = '#00C9B1'}
            onBlur={e => e.target.style.borderColor = '#D0ECE8'}
          />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#7A9BA8' }}>Loading...</div>
        ) : (
          <>
            
            {tab === 'users' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: '#fff', borderRadius: 18, border: '1px solid #D0F5F0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,201,177,0.07)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#F8FFFE' }}>
                      <tr>
                        {['ID', 'Name', 'Email', 'Enrollment No', 'School', 'Sem', 'Listings', 'Joined', 'Action'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} style={{ transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FFFE'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={tdStyle}><span style={{ background: '#F0FFFE', color: '#00A896', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>#{u.id}</span></td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{u.name}</td>
                          <td style={{ ...tdStyle, color: '#4A6572' }}>{u.email}</td>
                          <td style={{ ...tdStyle, color: '#4A6572', fontFamily: 'monospace' }}>{u.enrollment_no || '—'}</td>
                          <td style={{ ...tdStyle, color: '#4A6572', fontSize: 12 }}>{u.school_name || '—'}</td>
                          <td style={tdStyle}>{u.semester || '—'}</td>
                          <td style={tdStyle}><span style={{ background: '#E8FBF8', color: '#00A896', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{u.listings_count}</span></td>
                          <td style={{ ...tdStyle, fontSize: 12, color: '#7A9BA8' }}>{u.created_at?.split('T')[0]}</td>
                          <td style={tdStyle}>
                            <button onClick={() => deleteUser(u.id)} style={{
                              padding: '5px 14px', borderRadius: 8,
                              border: '1px solid #FFD0D0', background: '#FFF5F5',
                              color: '#E05555', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                            }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7A9BA8' }}>No users found</div>
                  )}
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #E0F5F0', background: '#F8FFFE', fontSize: 13, color: '#7A9BA8' }}>
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </motion.div>
            )}

            
            {tab === 'listings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: '#fff', borderRadius: 18, border: '1px solid #D0F5F0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,201,177,0.07)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#F8FFFE' }}>
                      <tr>
                        {['ID', 'Title', 'Category', 'Type', 'Price', 'Condition', 'Spam?', 'Seller ID', 'Posted', 'Action'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredListings.map(l => (
                        <tr key={l.id}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FFFE'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={tdStyle}><span style={{ background: '#F0FFFE', color: '#00A896', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>#{l.id}</span></td>
                          <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 200 }}>{l.title}</td>
                          <td style={tdStyle}>{l.category}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11,
                              background: l.listing_type === 'sell' ? '#E8FBF8' : l.listing_type === 'rent' ? '#EBF5FF' : '#FFF8E8',
                              color: l.listing_type === 'sell' ? '#00A896' : l.listing_type === 'rent' ? '#0080CC' : '#CC8800',
                            }}>{l.listing_type?.toUpperCase()}</span>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#00A896' }}>₹{l.price}</td>
                          <td style={tdStyle}>⭐ {l.condition}/5</td>
                          <td style={tdStyle}>
                            {l.is_spam
                              ? <span style={{ background: '#FFF0F0', color: '#E05555', padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>⚠️ SPAM</span>
                              : <span style={{ background: '#E8FBF8', color: '#00A896', padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>✅ OK</span>
                            }
                          </td>
                          <td style={tdStyle}>#{l.seller_id}</td>
                          <td style={{ ...tdStyle, fontSize: 12, color: '#7A9BA8' }}>{l.created_at?.split('T')[0]}</td>
                          <td style={tdStyle}>
                            <button onClick={() => deleteListing(l.id)} style={{
                              padding: '5px 14px', borderRadius: 8,
                              border: '1px solid #FFD0D0', background: '#FFF5F5',
                              color: '#E05555', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                            }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredListings.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#7A9BA8' }}>No listings found</div>
                  )}
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #E0F5F0', background: '#F8FFFE', fontSize: 13, color: '#7A9BA8' }}>
                  Showing {filteredListings.length} of {listings.length} listings
                </div>
              </motion.div>
            )}

            
            {tab === 'stats' && stats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: '#fff', borderRadius: 18, padding: 32, border: '1px solid #D0F5F0' }}>
                <h3 style={{ fontWeight: 800, color: '#0D2B35', marginBottom: 24 }}>📊 Platform Health</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'Sell Listings', value: stats.sell_listings, total: stats.total_listings, color: '#00C9B1' },
                    { label: 'Rent Listings', value: stats.rent_listings, total: stats.total_listings, color: '#0080CC' },
                    { label: 'Borrow Listings', value: stats.borrow_listings, total: stats.total_listings, color: '#CC8800' },
                    { label: 'Swap Listings', value: stats.swap_listings, total: stats.total_listings, color: '#7B2FBE' },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: '#0D2B35', fontSize: 14 }}>{item.label}</span>
                        <span style={{ color: '#7A9BA8', fontSize: 14 }}>{item.value} / {item.total}</span>
                      </div>
                      <div style={{ height: 8, background: '#F0FFFE', borderRadius: 4, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                          transition={{ duration: 0.8 }}
                          style={{ height: '100%', background: item.color, borderRadius: 4 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
