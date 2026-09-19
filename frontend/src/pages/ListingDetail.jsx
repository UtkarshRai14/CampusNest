import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

const typeColors = {
  sell:   { bg: '#E8FBF8', color: '#00A896' },
  rent:   { bg: '#EBF5FF', color: '#0080CC' },
  borrow: { bg: '#FFF8E8', color: '#CC8800' },
  swap:   { bg: '#F5EEFF', color: '#7B2FBE' },
}

const quickMessages = {
  sell: [
    { icon: '💰', label: 'Is price negotiable?', text: 'Hi! Is the price negotiable? I am interested in buying this.' },
    { icon: '📦', label: 'Is it still available?', text: 'Hi! Is this item still available? I want to buy it.' },
    { icon: '📍', label: 'Where to collect?', text: 'Hi! Where can I collect this item? Which hostel/block are you in?' },
    { icon: '🔍', label: 'More photos?', text: 'Hi! Can you share more photos of the item? I want to check the condition.' },
    { icon: '⭐', label: 'What is exact condition?', text: 'Hi! Can you describe the exact condition of the item in detail?' },
  ],
  rent: [
    { icon: '📅', label: 'Minimum rent period?', text: 'Hi! What is the minimum rental period? Can I rent for just a week?' },
    { icon: '🔑', label: 'How to collect & return?', text: 'Hi! How does the collection and return process work for renting?' },
    { icon: '💰', label: 'Any deposit required?', text: 'Hi! Is there a security deposit required for renting this item?' },
    { icon: '📍', label: 'Where are you located?', text: 'Hi! Which hostel/block are you in? I want to rent this item.' },
  ],
  borrow: [
    { icon: '📅', label: 'Available this week?', text: 'Hi! Is this available to borrow this week? I need it urgently.' },
    { icon: '⏰', label: 'How many days can I borrow?', text: 'Hi! For how many days can I borrow this? I need it for my exam.' },
    { icon: '📍', label: 'Where to collect?', text: 'Hi! Where can I collect this from? Which hostel/block are you in?' },
    { icon: '✅', label: 'I will take care of it', text: 'Hi! I want to borrow this. I promise to return it in the same condition. Where are you located?' },
  ],
  swap: [
    { icon: '🔄', label: 'What do you want in swap?', text: 'Hi! What items are you looking for in exchange? I want to do a swap.' },
    { icon: '📦', label: 'I have something to offer', text: 'Hi! I am interested in swapping. I have some items that might interest you. Can we discuss?' },
    { icon: '📍', label: 'Where to meet?', text: 'Hi! Where can we meet to do the swap? Which area of campus are you in?' },
  ],
}

const conditionLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Like New']

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [imgError, setImgError] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [activeQuick, setActiveQuick] = useState(null)

  useEffect(() => {
    API.get(`/listings/${id}`)
      .then(r => setListing(r.data))
      .catch(() => { toast.error('Listing not found'); navigate('/listings') })
      .finally(() => setLoading(false))
  }, [id])

  const handleQuickMessage = (template) => {
    setMessage(template.text)
    setActiveQuick(template.label)
  }

  const sendMessage = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to contact seller')
      navigate('/login')
      return
    }
    if (!message.trim()) { toast.error('Write a message first'); return }
    if (user?.id === listing?.seller_id) { toast.error('You cannot message yourself!'); return }

    setSending(true)
    try {
      await API.post('/messages/', {
        content: message.trim(),
        listing_id: parseInt(id),
        receiver_id: listing.seller_id,
      })
      toast.success('Message sent to seller! 🎉')
      setMessage('')
      setActiveQuick(null)
      navigate('/messages')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') toast.error(detail)
      else toast.error('Failed to send message')
    } finally { setSending(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
        <p style={{ color: '#7A9BA8', fontWeight: 600 }}>Loading listing...</p>
      </div>
    </div>
  )

  if (!listing) return null
  const tc = typeColors[listing.listing_type] || typeColors.sell
  const isOwner = user?.id === listing.seller_id
  const templates = quickMessages[listing.listing_type] || quickMessages.sell

  return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE', padding: window.innerWidth < 768 ? '16px' : '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 14, color: '#7A9BA8' }}>
          <Link to="/listings" style={{ color: '#00A896', textDecoration: 'none', fontWeight: 600 }}>← Browse</Link>
          <span>/</span><span>{listing.category}</span><span>/</span>
          <span style={{ color: '#0D2B35', fontWeight: 600 }}>{listing.title?.substring(0, 30)}...</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 400px', gap: 28, alignItems: 'start' }}>

          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            
            <div style={{
              borderRadius: 20, overflow: 'hidden', marginBottom: 24,
              border: '1px solid #D0F5F0', background: '#F8FFFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320,
            }}>
              {!imgError && listing.image_url ? (
                <img src={listing.image_url} alt={listing.title}
                  onError={() => setImgError(true)}
                  style={{ width: '100%', maxHeight: 420, objectFit: 'contain', padding: 16 }} />
              ) : (
                <div style={{ fontSize: 80, opacity: 0.3 }}>📦</div>
              )}
            </div>

            
            <div style={{ background: '#fff', borderRadius: 18, padding: 28, border: '1px solid #D0F5F0', boxShadow: '0 4px 20px rgba(0,201,177,0.06)' }}>
              <h2 style={{ fontWeight: 800, color: '#0D2B35', marginBottom: 14, fontSize: 18 }}>About this item</h2>
              <p style={{ color: '#4A6572', lineHeight: 1.8, fontSize: 15 }}>{listing.description || 'No description provided.'}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
                {[listing.category, listing.department_tag, listing.semester_tag ? `Sem ${listing.semester_tag}` : null]
                  .filter(Boolean).map(tag => (
                  <span key={tag} style={{ padding: '5px 14px', borderRadius: 20, background: '#F0FFFE', border: '1px solid #B2EFE8', color: '#00A896', fontSize: 13, fontWeight: 600 }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            
            <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #D0F5F0', boxShadow: '0 4px 20px rgba(0,201,177,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                
                {listing.verification_label && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: listing.verification_bg || '#E8FBF8',
                    color: listing.verification_color || '#00A896',
                    borderRadius: 10, padding: '8px 16px',
                    fontSize: 13, fontWeight: 700, marginBottom: 16,
                    border: `1px solid ${listing.verification_color || '#00A896'}33`,
                    width: 'fit-content',
                  }}>
                    <span style={{ fontSize: 16 }}>
                      {listing.ai_verified ? '🤖' : '⚠️'}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{listing.verification_label}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500 }}>
                        {((1 - (listing.spam_score || 0)) * 100).toFixed(0)}% Safety Score · Powered by ML
                      </div>
                    </div>
                  </div>
                )}

                <span style={{ padding: '4px 14px', borderRadius: 20, background: tc.bg, color: tc.color, fontWeight: 700, fontSize: 13 }}>
                  {listing.listing_type?.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: '#7A9BA8' }}>{'⭐'.repeat(listing.condition)}</span>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0D2B35', marginBottom: 12, lineHeight: 1.3 }}>{listing.title}</h1>
              <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 20, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {listing.price === 1 ? 'Negotiable' : `₹${listing.price}`}
                {listing.listing_type === 'rent' && <span style={{ fontSize: 13, WebkitTextFillColor: '#7A9BA8' }}>/month</span>}
                {listing.listing_type === 'borrow' && <span style={{ fontSize: 13, WebkitTextFillColor: '#7A9BA8' }}>/day</span>}
              </div>
              {[
                ['📦 Category', listing.category],
                ['⭐ Condition', `${listing.condition}/5 — ${conditionLabels[listing.condition] || ''}`],
                ['🎓 Department', listing.department_tag || 'IIIT Sonepat'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F0F8F6' }}>
                  <span style={{ color: '#7A9BA8', fontSize: 14 }}>{label}</span>
                  <span style={{ color: '#0D2B35', fontWeight: 600, fontSize: 14 }}>{value}</span>
                </div>
              ))}
            </div>

            
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #D0F5F0' }}>
              <h3 style={{ fontWeight: 700, color: '#0D2B35', marginBottom: 16, fontSize: 15 }}>👤 Seller</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, #00C9B1, #00A896)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>
                  {listing.seller_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0D2B35', fontSize: 15 }}>{listing.seller_name || 'IIIT Sonepat Student'}</div>
                  <div style={{ fontSize: 13, color: '#7A9BA8', marginTop: 2 }}>{listing.seller_school || 'IIIT Sonepat'}</div>
                  <div style={{ fontSize: 12, color: '#00A896', marginTop: 2 }}>{listing.seller_department}</div>
                </div>
              </div>

              
              <AnimatePresence>
                {showContact && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: 16, padding: 16, background: '#F8FFFE', borderRadius: 12, border: '1px solid #D0F5F0' }}>
                    <p style={{ fontSize: 13, color: '#4A6572', marginBottom: 8, fontWeight: 600 }}>📧 Contact Seller Directly:</p>
                    <a href={`mailto:${listing.seller_email || ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00A896', fontWeight: 700, fontSize: 14, textDecoration: 'none', marginBottom: 8 }}>
                      ✉️ {listing.seller_email || 'Login to see email'}
                    </a>
                    <p style={{ fontSize: 12, color: '#A0BCBB' }}>Mention the listing title in your email</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            
            {isOwner ? (
              <div style={{ background: '#F0FFFE', borderRadius: 16, padding: 20, border: '1px solid #B2EFE8', textAlign: 'center' }}>
                <p style={{ color: '#00A896', fontWeight: 700, marginBottom: 12 }}>✅ This is your listing</p>
                <button onClick={() => navigate('/profile')} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Manage in Profile →
                </button>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #D0F5F0' }}>
                <h3 style={{ fontWeight: 800, color: '#0D2B35', marginBottom: 16, fontSize: 16 }}>💬 Contact Seller</h3>

                
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#A0BCBB', letterSpacing: 0.5, marginBottom: 10 }}>
                    QUICK QUERIES
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {templates.map(t => (
                      <motion.button key={t.label}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickMessage(t)}
                        style={{
                          padding: '10px 14px', borderRadius: 10, border: '1.5px solid',
                          borderColor: activeQuick === t.label ? '#00C9B1' : '#E0F5F0',
                          background: activeQuick === t.label ? 'rgba(0,201,177,0.08)' : '#F8FFFE',
                          color: activeQuick === t.label ? '#00A896' : '#4A6572',
                          fontWeight: activeQuick === t.label ? 700 : 500,
                          fontSize: 13, cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <span>{t.icon}</span> {t.label}
                        {activeQuick === t.label && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#00C9B1' }}>✓ Selected</span>}
                      </motion.button>
                    ))}

                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      onClick={() => { setShowContact(!showContact); setMessage('') ; setActiveQuick(null) }}
                      style={{
                        padding: '10px 14px', borderRadius: 10,
                        border: '1.5px dashed #D0ECE8',
                        background: showContact ? 'rgba(0,201,177,0.05)' : 'transparent',
                        color: '#7A9BA8', fontSize: 13, cursor: 'pointer',
                        textAlign: 'left', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      📞 None of these? Get seller contact directly
                    </motion.button>
                  </div>
                </div>

                
                {!showContact && (
                  <>
                    {!isAuthenticated && (
                      <div style={{ background: '#FFF8E8', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #F5DFA0' }}>
                        <p style={{ color: '#CC8800', fontSize: 13, fontWeight: 600 }}>
                          ⚠️ <Link to="/login" style={{ color: '#00A896' }}>Login</Link> to contact the seller
                        </p>
                      </div>
                    )}
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={`Hi, I'm interested in your ${listing.title?.substring(0, 30)}...`}
                      rows={3}
                      style={{
                        width: '100%', padding: '12px', borderRadius: 10,
                        border: '1.5px solid #D0ECE8', outline: 'none', fontSize: 14,
                        color: '#0D2B35', background: '#F8FFFE', resize: 'vertical',
                        boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit', lineHeight: 1.5,
                      }}
                      onFocus={e => e.target.style.borderColor = '#00C9B1'}
                      onBlur={e => e.target.style.borderColor = '#D0ECE8'}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={sendMessage}
                      disabled={sending || !message.trim()}
                      style={{
                        width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                        background: sending || !message.trim() ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)',
                        color: '#fff', fontWeight: 700, fontSize: 15,
                        cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
                        boxShadow: sending ? 'none' : '0 6px 20px rgba(0,201,177,0.3)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {sending ? '⏳ Sending...' : '📩 Send Message'}
                    </motion.button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
