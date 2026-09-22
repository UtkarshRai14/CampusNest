import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import API from '../api/axios'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

function getSmartReplies(messages, currentUserId) {
  const lastMsg = [...messages].reverse().find(m => m.sender_id !== currentUserId)
  if (!lastMsg) return getDefaultReplies()
  const text = lastMsg.content.toLowerCase()

  if (text.includes('negotia') || text.includes('price') || text.includes('discount')) {
    return { label: '💰 Price Replies', replies: [
      { icon: '🤝', text: 'Price is slightly negotiable. Come meet me after 7 PM, we can discuss!' },
      { icon: '💰', text: 'Price is fixed. Best quality at this price!' },
      { icon: '📉', text: 'For quick pickup today, I can offer a small discount. Come after 7 PM.' },
    ]}
  }
  if (text.includes('available') || text.includes('still') || text.includes('sold')) {
    return { label: '📦 Availability Replies', replies: [
      { icon: '✅', text: 'Yes, still available! Come after 7 PM today.' },
      { icon: '⚡', text: 'Available right now! Come to my hostel anytime.' },
      { icon: '⏳', text: 'One person is already looking. First come first served!' },
      { icon: '❌', text: 'Sorry, this item has been sold already.' },
    ]}
  }
  if (text.includes('where') || text.includes('location') || text.includes('collect')) {
    return { label: '📍 Location Replies', replies: [
      { icon: '🏠', text: 'I am in Boys Hostel Block B, Room 204. Come after 7 PM.' },
      { icon: '🏠', text: 'I am in Girls Hostel Block A, Room 102. Available after 6 PM.' },
      { icon: '🏫', text: 'Let\'s meet near the campus main gate. Free after 5 PM today.' },
      { icon: '☕', text: 'Meet at college canteen tomorrow 1-2 PM lunch break.' },
    ]}
  }
  if (text.includes('condition') || text.includes('working') || text.includes('photo')) {
    return { label: '⭐ Condition Replies', replies: [
      { icon: '✅', text: 'Excellent condition, works perfectly. Come inspect before buying!' },
      { icon: '📸', text: 'I will send more photos. Share your WhatsApp number.' },
      { icon: '🔍', text: 'Minor wear but fully functional. Come check in person after 7 PM.' },
    ]}
  }
  if (text.includes('when') || text.includes('time') || text.includes('today')) {
    return { label: '📅 Timing Replies', replies: [
      { icon: '🌙', text: 'I am free today after 7 PM. Come to my hostel!' },
      { icon: '📅', text: 'Available tomorrow evening after 6 PM.' },
      { icon: '⚡', text: 'Free right now! Come whenever you want.' },
      { icon: '🗓️', text: 'This weekend works — Saturday or Sunday after 2 PM.' },
    ]}
  }
  return getDefaultReplies()
}

function getDefaultReplies() {
  return { label: '💬 Quick Replies', replies: [
    { icon: '✅', text: 'Yes, still available! Come meet me after 7 PM today.' },
    { icon: '🤝', text: 'Price is slightly negotiable. Let\'s discuss in person after 7 PM.' },
    { icon: '📍', text: 'I am in hostel Block B. Come after 7 PM any weekday.' },
    { icon: '👍', text: 'Sounds good! Let\'s finalize the deal today evening.' },
    { icon: '📸', text: 'I will send more photos. Share your WhatsApp number.' },
    { icon: '✅', text: 'Deal confirmed! See you soon. 🎉' },
  ]}
}

export default function Messages() {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [smartReplies, setSmartReplies] = useState(getDefaultReplies())
  const [refreshing, setRefreshing] = useState(false)
  const bottomRef = useRef(null)
  const refreshTimerRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    fetchConversations()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (messages.length > 0 && user) {
      setSmartReplies(getSmartReplies(messages, user.id))
    }
  }, [messages])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const res = await API.get('/messages/conversations')
      const data = res.data?.conversations || res.data || []
      setConversations(Array.isArray(data) ? data : [])
    } catch { setConversations([]) }
    finally { setLoading(false) }
  }

  
  useEffect(() => {
    if (!activeConv) return
    const autoRefresh = setInterval(async () => {
      try {
        const res = await API.get(`/messages/${activeConv.listing_id}/${activeConv.other_user_id}`)
        const newMsgs = Array.isArray(res.data) ? res.data : []
        if (newMsgs.length !== messages.length) {
          setMessages(newMsgs)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(autoRefresh)
  }, [activeConv, messages.length])

  const openConversation = async (conv) => {
    setActiveConv(conv)
    setShowQuickReplies(false)
    try {
      const res = await API.get(`/messages/${conv.listing_id}/${conv.other_user_id}`)
      const msgs = Array.isArray(res.data) ? res.data : []
      setMessages(msgs)
      if (msgs.length > 0 && user) setSmartReplies(getSmartReplies(msgs, user.id))
    } catch { setMessages([]) }
  }

  const refreshMessages = async () => {
    if (!activeConv) return
    setRefreshing(true)
    try {
      const res = await API.get(`/messages/${activeConv.listing_id}/${activeConv.other_user_id}`)
      setMessages(Array.isArray(res.data) ? res.data : [])
      toast.success('Refreshed!')
    } catch { toast.error('Failed to refresh') }
    finally { setRefreshing(false) }
  }

  const shareContact = () => {
    if (!activeConv) return
    const phone = user?.whatsapp || '9' + Math.floor(100000000 + Math.random() * 900000000)
    const card = `📇 Contact Card\n👤 ${user?.name}\n✉️ ${user?.email}\n📱 +91 ${phone}`
    sendMessage(card)
  }

  const deleteConversation = async () => {
    if (!activeConv) return
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    try {
      await API.delete(`/messages/${activeConv.listing_id}/${activeConv.other_user_id}`)
      toast.success('Conversation deleted')
      setActiveConv(null)
      setMessages([])
      fetchConversations()
    } catch { toast.error('Failed to delete') }
  }

  const sendMessage = async (text) => {
    const msgText = text || input.trim()
    if (!msgText || !activeConv) return
    setInput('')
    setShowQuickReplies(false)
    setSending(true)

    const tempMsg = {
      id: Date.now(),
      content: msgText,
      sender_id: user.id,
      receiver_id: activeConv.other_user_id,
      listing_id: activeConv.listing_id,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      await API.post('/messages/', {
        content: msgText,
        listing_id: activeConv.listing_id,
        receiver_id: activeConv.other_user_id,
      })
      
      setTimeout(async () => {
        const res = await API.get(`/messages/${activeConv.listing_id}/${activeConv.other_user_id}`)
        setMessages(Array.isArray(res.data) ? res.data : [])
      }, 800)
      fetchConversations()
    } catch {
      toast.error('Failed to send')
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    } finally { setSending(false) }
  }

  if (!isAuthenticated) return null

  const lastReceivedMsg = [...messages].reverse().find(m => m.sender_id !== user?.id)

  return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 26, fontWeight: 900, color: '#0D2B35', marginBottom: 24 }}>
          💬 Messages
        </motion.h1>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '300px 1fr', gap: 20, height: window.innerWidth < 768 ? '75vh' : '78vh' }}>

          
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #D0F5F0', overflow: 'hidden', display: (window.innerWidth < 768 && activeConv) ? 'none' : 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,201,177,0.07)' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E0F5F0', fontWeight: 800, color: '#0D2B35', fontSize: 15, background: 'linear-gradient(135deg, #F8FFFE, #F0FFFE)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Conversations
              {conversations.length > 0 && (
                <span style={{ background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{conversations.length}</span>
              )}
              <button onClick={fetchConversations} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#00A896' }} title="Refresh">🔄</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 20 }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #F0F8F6' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E0F5F0', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 13, background: '#E0F5F0', borderRadius: 6, marginBottom: 6, width: '70%' }} />
                        <div style={{ height: 11, background: '#E0F5F0', borderRadius: 6, width: '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p style={{ color: '#7A9BA8', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No messages yet</p>
                  <Link to="/listings" style={{ display: 'inline-block', padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Browse Listings</Link>
                </div>
              ) : conversations.map((conv, i) => (
                <motion.div key={conv.conversation_id || i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => openConversation(conv)}
                  style={{
                    padding: '14px 18px', cursor: 'pointer',
                    background: activeConv?.conversation_id === conv.conversation_id ? 'rgba(0,201,177,0.08)' : 'transparent',
                    borderLeft: activeConv?.conversation_id === conv.conversation_id ? '3px solid #00C9B1' : '3px solid transparent',
                    borderBottom: '1px solid #F5FFFE', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>
                      {conv.other_user_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#0D2B35', fontSize: 14, marginBottom: 2 }}>{conv.other_user_name}</div>
                      <div style={{ fontSize: 12, color: '#00A896', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📦 {conv.listing_title}</div>
                      {conv.last_message && (
                        <div style={{ fontSize: 12, color: '#A0BCBB', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.last_message}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #D0F5F0', display: (window.innerWidth < 768 && !activeConv) ? 'none' : 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,201,177,0.07)' }}>
            {!activeConv ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.4 }}>💬</div>
                <h3 style={{ color: '#0D2B35', fontWeight: 800, marginBottom: 8 }}>Select a conversation</h3>
                <p style={{ color: '#7A9BA8', fontSize: 14 }}>Choose from the left to start chatting</p>
              </div>
            ) : (
              <>
                
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #E0F5F0', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #F8FFFE, #F0FFFE)', flexWrap: 'nowrap' }}>
                  {window.innerWidth < 768 && (
                    <button onClick={() => setActiveConv(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#00A896', flexShrink: 0, padding: 0, lineHeight: 1 }}>←</button>
                  )}

                  <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {activeConv.other_user_name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, color: '#0D2B35', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeConv.other_user_name}</div>
                    <div style={{ fontSize: 11, color: '#00A896', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📦 {activeConv.listing_title}</div>
                    {activeConv.other_user_email && window.innerWidth >= 768 && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        {activeConv.other_user_email && (
                          <a href={'mailto:' + activeConv.other_user_email} style={{ fontSize: 11, color: '#7A9BA8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ✉️ {activeConv.other_user_email}
                          </a>
                        )}
                        {activeConv.other_user_whatsapp && (
                          <a href={'https://wa.me/91' + activeConv.other_user_whatsapp.replace(/[^0-9]/g, '')} target='_blank' rel='noreferrer'
                            style={{ fontSize: 11, color: '#25D366', fontWeight: 700, textDecoration: 'none', background: '#E8FFF0', padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                            📱 WhatsApp
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: window.innerWidth < 768 ? 4 : 8, alignItems: 'center', flexShrink: 0 }}>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={shareContact}
                      title="Share my contact"
                      style={{ width: window.innerWidth < 768 ? 30 : 36, height: window.innerWidth < 768 ? 30 : 36, borderRadius: '50%', border: '1.5px solid #B2EFE8', background: '#E8FBF8', cursor: 'pointer', fontSize: window.innerWidth < 768 ? 13 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00A896', flexShrink: 0 }}>
                      📇
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={refreshMessages} disabled={refreshing}
                      title="Refresh messages"
                      style={{ width: window.innerWidth < 768 ? 30 : 36, height: window.innerWidth < 768 ? 30 : 36, borderRadius: '50%', border: '1.5px solid #D0ECE8', background: '#fff', cursor: 'pointer', fontSize: window.innerWidth < 768 ? 13 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00A896', flexShrink: 0 }}>
                      {refreshing ? '⏳' : '🔄'}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={deleteConversation}
                      title="Delete conversation"
                      style={{ width: window.innerWidth < 768 ? 30 : 36, height: window.innerWidth < 768 ? 30 : 36, borderRadius: '50%', border: '1.5px solid #FFD0D0', background: '#FFF5F5', cursor: 'pointer', fontSize: window.innerWidth < 768 ? 13 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E05555', flexShrink: 0 }}>
                      🗑️
                    </motion.button>
                    {window.innerWidth >= 768 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C9B1' }} />
                        <span style={{ fontSize: 12, color: '#7A9BA8' }}>Online</span>
                      </div>
                    )}
                  </div>
                </div>

                
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(180deg, #FAFFFE 0%, #F5FFFE 100%)' }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#A0BCBB' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                      <p style={{ fontSize: 14 }}>Start the conversation!</p>
                    </div>
                  ) : messages.map((m, i) => {
                    const isMine = m.sender_id === user?.id
                    return (
                      <motion.div key={m.id || i}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}
                      >
                        {!isMine && (
                          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>
                            {activeConv.other_user_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div style={{
                          maxWidth: window.innerWidth < 768 ? '78%' : '65%', padding: window.innerWidth < 768 ? '9px 13px' : '11px 16px', borderRadius: 18,
                          borderBottomRightRadius: isMine ? 4 : 18,
                          borderBottomLeftRadius: isMine ? 18 : 4,
                          background: isMine ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#fff',
                          color: isMine ? '#fff' : '#0D2B35',
                          fontSize: window.innerWidth < 768 ? 13 : 14, lineHeight: 1.5,
                          border: isMine ? 'none' : '1px solid #E0F5F0',
                          boxShadow: isMine ? '0 4px 12px rgba(0,201,177,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
                          whiteSpace: 'pre-line',
                        }}>
                          {m.content.startsWith('📇 Contact Card') ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontWeight: 800, fontSize: 12, opacity: 0.8, marginBottom: 4 }}>📇 CONTACT SHARED</div>
                              {m.content.split('\n').slice(1).map((line, idx) => (
                                <div key={idx} style={{ fontSize: 13 }}>{line}</div>
                              ))}
                            </div>
                          ) : m.content}
                          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMine && ' ✓'}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                
                <AnimatePresence>
                  {showQuickReplies && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ borderTop: '1px solid #E0F5F0', background: '#F8FFFE', overflow: 'hidden' }}
                    >
                      <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E0F5F0' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#00A896' }}>⚡ {smartReplies.label}</span>
                        {lastReceivedMsg && (
                          <span style={{ fontSize: 11, color: '#A0BCBB', background: '#F0FFFE', padding: '2px 10px', borderRadius: 20, border: '1px solid #E0F5F0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Re: "{lastReceivedMsg.content.substring(0, 25)}..."
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                        {smartReplies.replies.map((reply, i) => (
                          <motion.button key={i}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }}
                            onClick={() => sendMessage(reply.text)}
                            style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #D0ECE8', background: '#fff', color: '#0D2B35', fontSize: 13, cursor: 'pointer', fontWeight: 500, textAlign: 'left', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#00C9B1'; e.currentTarget.style.background = '#F0FFFE' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#D0ECE8'; e.currentTarget.style.background = '#fff' }}
                          >
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{reply.icon}</span>
                            <span style={{ flex: 1 }}>{reply.text}</span>
                            <span style={{ fontSize: 11, color: '#00C9B1', fontWeight: 700 }}>Send →</span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                
                <div style={{ padding: window.innerWidth < 768 ? '10px 10px' : '12px 16px', borderTop: '1px solid #E0F5F0', display: 'flex', gap: window.innerWidth < 768 ? 6 : 10, alignItems: 'center', background: '#fff' }}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    style={{ width: window.innerWidth < 768 ? 36 : 42, height: window.innerWidth < 768 ? 36 : 42, borderRadius: '50%', border: showQuickReplies ? 'none' : '1.5px solid #D0ECE8', background: showQuickReplies ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#F0FFFE', color: showQuickReplies ? '#fff' : '#00A896', fontSize: 16, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    ⚡
                  </motion.button>
                  <input
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={window.innerWidth < 768 ? "Type a message..." : "Type a message or tap ⚡ for smart replies..."}
                    style={{ flex: 1, minWidth: 0, padding: window.innerWidth < 768 ? '10px 12px' : '12px 16px', borderRadius: 24, border: '1.5px solid #D0ECE8', outline: 'none', fontSize: window.innerWidth < 768 ? 13 : 14, color: '#0D2B35', background: '#F8FFFE', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#00C9B1'}
                    onBlur={e => e.target.style.borderColor = '#D0ECE8'}
                  />
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage()} disabled={sending || !input.trim()}
                    style={{ width: window.innerWidth < 768 ? 38 : 44, height: window.innerWidth < 768 ? 38 : 44, borderRadius: '50%', border: 'none', background: input.trim() ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#E0F5F0', color: input.trim() ? '#fff' : '#A0BCBB', fontSize: 18, cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: input.trim() ? '0 4px 12px rgba(0,201,177,0.4)' : 'none', transition: 'all 0.2s', flexShrink: 0 }}>
                    ↑
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
