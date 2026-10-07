import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

export default function Profile() {
  const { isAuthenticated, user, logout, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [myListings, setMyListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeTab, setActiveTab] = useState('listings')
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '')
  const [savingWA, setSavingWA] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', price: '', condition: 3 })
  const [savingEdit, setSavingEdit] = useState(false)

  const loadListings = () => {
    setLoading(true)
    setLoadError(false)
    API.get('/listings/my-listings')
      .then(r => setMyListings(Array.isArray(r.data) ? r.data : []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    loadListings()
  }, [])

  // The saved number can arrive after the page opens (the app refreshes the user on load).
  useEffect(() => { setWhatsapp(user?.whatsapp || '') }, [user?.whatsapp])

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return
    try {
      await API.delete('/listings/' + id)
      setMyListings(prev => prev.filter(l => l.id !== id))
      toast.success('Listing deleted')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete') }
  }

  const saveWhatsApp = async () => {
    const value = whatsapp.trim()
    if (!value && !user?.whatsapp) { toast.error('Enter your WhatsApp number'); return }
    setSavingWA(true)
    try {
      const res = await API.put('/users/me', { whatsapp: value })
      updateUser(res.data.user)
      toast.success(value ? 'WhatsApp saved!' : 'WhatsApp removed')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save') }
    finally { setSavingWA(false) }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditForm({
      title: item.title,
      description: item.description || '',
      price: item.price,
      condition: item.condition,
    })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async () => {
    const original = myListings.find(l => l.id === editingId)
    const title = editForm.title.trim()
    const description = editForm.description.trim()
    const price = Number(editForm.price)
    if (!title) { toast.error('Title is required'); return }
    if (!(price > 0)) { toast.error('Enter a valid price'); return }

    // Only changed fields are sent.
    const changes = {}
    if (title !== original.title) changes.title = title
    if (description !== (original.description || '')) changes.description = description
    if (price !== original.price) changes.price = price
    if (editForm.condition !== original.condition) changes.condition = editForm.condition
    if (Object.keys(changes).length === 0) { toast('No changes to save'); return }

    setSavingEdit(true)
    try {
      const res = await API.put('/listings/' + editingId, changes)
      setMyListings(prev => prev.map(l => (l.id === editingId ? res.data : l)))
      toast.success('Listing updated')
      setEditingId(null)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update listing') }
    finally { setSavingEdit(false) }
  }

  const editInputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #D0ECE8',
    outline: 'none', fontSize: 14, color: '#0D2B35', background: '#F8FFFE', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const editLabelStyle = { fontSize: 12, fontWeight: 600, color: '#4A6572', display: 'block', marginBottom: 4 }

  const handleLogout = () => { logout(); navigate('/') }
  const typeColors = { sell: '#00A896', rent: '#0080CC', borrow: '#CC8800', swap: '#7B2FBE' }

  return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#fff', borderRadius: 24, padding: 36, border: '1px solid #D0F5F0', boxShadow: '0 8px 40px rgba(0,201,177,0.1)', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 36, boxShadow: '0 6px 20px rgba(0,201,177,0.35)' }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0D2B35', marginBottom: 6 }}>{user?.name}</h1>
              <p style={{ color: '#7A9BA8', marginBottom: 4 }}>✉️ {user?.email}</p>
              <p style={{ color: '#7A9BA8', marginBottom: 12 }}>🎓 {user?.school || '—'} · Sem {user?.semester || '—'}</p>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center', background: '#F0FFFE', borderRadius: 12, padding: '10px 20px', border: '1px solid #B2EFE8' }}>
                  <div style={{ fontWeight: 800, color: '#00A896', fontSize: 20 }}>{myListings.length}</div>
                  <div style={{ fontSize: 12, color: '#7A9BA8' }}>Listings</div>
                </div>
                <div style={{ textAlign: 'center', background: '#F0FFFE', borderRadius: 12, padding: '10px 20px', border: '1px solid #B2EFE8' }}>
                  <div style={{ fontWeight: 800, color: '#00A896', fontSize: 20 }}>{myListings.filter(l => l.listing_type === 'sell').length}</div>
                  <div style={{ fontSize: 12, color: '#7A9BA8' }}>For Sale</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/post" style={{ padding: '10px 24px', borderRadius: 10, textDecoration: 'none', background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, textAlign: 'center', boxShadow: '0 4px 15px rgba(0,201,177,0.3)' }}>+ New Listing</Link>
              <button onClick={handleLogout} style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid #FFD0D0', background: '#FFF5F5', color: '#E05555', fontWeight: 600, cursor: 'pointer' }}>Logout</button>
            </div>
          </div>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #E0F5F0' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0D2B35', marginBottom: 4 }}>📱 Your WhatsApp number</p>
            <p style={{ fontSize: 12, color: '#7A9BA8', marginBottom: 12 }}>Logged-in users can see it on your listings and in your automatic first reply. You can also share it from a chat. Clear it and save to remove it.</p>
            <div style={{ display: 'flex', gap: 10, maxWidth: 400 }}>
              <input type="tel" placeholder="e.g. 9876543210" value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #D0ECE8', outline: 'none', fontSize: 14, color: '#0D2B35', background: '#F8FFFE' }}
                onFocus={e => e.target.style.borderColor = '#25D366'}
                onBlur={e => e.target.style.borderColor = '#D0ECE8'}
              />
              <button onClick={saveWhatsApp} disabled={savingWA}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, cursor: savingWA ? 'not-allowed' : 'pointer', fontSize: 14 }}>
                {savingWA ? '...' : 'Save 📱'}
              </button>
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 6, border: '1px solid #D0F5F0', width: 'fit-content' }}>
          {[['listings', '📦 My Listings'], ['stats', '📊 Stats']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', background: activeTab === key ? 'linear-gradient(135deg, #00C9B1, #00A896)' : 'transparent', color: activeTab === key ? '#fff' : '#4A6572', fontWeight: 600, fontSize: 14 }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'listings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#7A9BA8' }}>Loading...</div>
            ) : loadError ? (
              <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: 20, border: '1px dashed #F5B5B5' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
                <h3 style={{ color: '#0D2B35', marginBottom: 8 }}>Unable to load your listings. Please try again.</h3>
                <button onClick={loadListings} style={{ marginTop: 16, padding: '12px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
              </div>
            ) : myListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: 20, border: '1px dashed #B2EFE8' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
                <h3 style={{ color: '#0D2B35', marginBottom: 8 }}>No listings yet</h3>
                <Link to="/post" style={{ display: 'inline-block', marginTop: 16, padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>Post Your First Listing</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {myListings.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: editingId === item.id ? '1.5px solid #00C9B1' : '1px solid #D0F5F0', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    {editingId === item.id ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p style={{ fontWeight: 800, color: '#0D2B35', fontSize: 15 }}>✏️ Edit listing</p>
                        <div>
                          <label style={editLabelStyle}>Title</label>
                          <input style={editInputStyle} maxLength={120} value={editForm.title}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div>
                          <label style={editLabelStyle}>Description</label>
                          <textarea style={{ ...editInputStyle, minHeight: 80, resize: 'vertical' }} maxLength={2000} value={editForm.description}
                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 160px' }}>
                            <label style={editLabelStyle}>Price (₹)</label>
                            <input type="number" min="1" style={editInputStyle} value={editForm.price}
                              onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
                          </div>
                          <div style={{ flex: '2 1 240px' }}>
                            <label style={editLabelStyle}>Condition (1=Poor · 5=Like New)</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} onClick={() => setEditForm(f => ({ ...f, condition: n }))} style={{
                                  flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid',
                                  borderColor: editForm.condition === n ? '#00C9B1' : '#D0ECE8',
                                  background: editForm.condition === n ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#fff',
                                  color: editForm.condition === n ? '#fff' : '#4A6572',
                                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                }}>{n}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={cancelEdit} disabled={savingEdit} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #D0ECE8', background: '#fff', color: '#4A6572', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={saveEdit} disabled={savingEdit} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: savingEdit ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: savingEdit ? 'not-allowed' : 'pointer' }}>{savingEdit ? 'Saving...' : 'Save changes'}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                    {item.image_url
                      ? <img src={item.image_url} alt={item.title} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'contain', flexShrink: 0, background: '#F8FFFE', padding: 4, border: '1px solid #E0F5F0' }} />
                      : <div style={{ width: 64, height: 64, borderRadius: 10, background: '#E0FBF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📦</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#0D2B35', marginBottom: 4 }}>{item.title}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: '#F0FFFE', color: typeColors[item.listing_type] || '#00A896', fontWeight: 700 }}>
                          {item.listing_type?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 12, color: '#7A9BA8' }}>{item.category}</span>
                        <span style={{ fontSize: 12, color: '#7A9BA8' }}>⭐ {item.condition}/5</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#00A896', fontSize: 18 }}>₹{item.price}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to={'/listings/' + item.id} style={{ padding: '7px 16px', borderRadius: 8, textDecoration: 'none', border: '1.5px solid #D0ECE8', color: '#00A896', fontWeight: 600, fontSize: 13 }}>View</Link>
                      <button onClick={() => startEdit(item)} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #B2EFE8', background: '#F0FFFE', color: '#00A896', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => deleteListing(item.id)} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #FFD0D0', background: '#FFF5F5', color: '#E05555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Delete</button>
                    </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 20 }}>
            {[
              { icon: '📦', label: 'Total Listings', value: myListings.length },
              { icon: '💰', label: 'For Sale', value: myListings.filter(l => l.listing_type === 'sell').length },
              { icon: '🔑', label: 'For Rent', value: myListings.filter(l => l.listing_type === 'rent').length },
              { icon: '🤝', label: 'To Borrow', value: myListings.filter(l => l.listing_type === 'borrow').length },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 18, padding: 28, border: '1px solid #D0F5F0', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 36, fontWeight: 900, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
                <div style={{ color: '#7A9BA8', fontSize: 14, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
