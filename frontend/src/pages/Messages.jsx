import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import API from '../api/axios'
import socket, { onReconnect } from '../api/socket'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

// Canned, generic replies. They never contain personal details such as locations or times.
const BUYER_REPLIES = [
  { icon: '📦', text: 'Is this still available?' },
  { icon: '💰', text: 'Is the price negotiable?' },
  { icon: '📍', text: 'Where and when can we meet on campus?' },
  { icon: '📸', text: 'Could you share more photos?' },
  { icon: '👍', text: "Sounds good, let's do it." },
  { icon: '🙏', text: 'Thank you!' },
]

const SELLER_DEFAULT_REPLIES = [
  { icon: '✅', text: 'Yes, it is still available.' },
  { icon: '🤝', text: "The price is negotiable. Let's discuss." },
  { icon: '📍', text: "Let's meet on campus. When are you free?" },
  { icon: '👍', text: "Sounds good, let's do it." },
  { icon: '🙏', text: 'Thanks for your interest!' },
]

// The seller's suggestions depend on what the buyer last asked about.
const SELLER_TOPICS = [
  { keywords: ['negotia', 'price', 'discount'], label: '💰 Price', replies: [
    { icon: '🤝', text: 'The price is negotiable. What offer do you have in mind?' },
    { icon: '💰', text: 'Sorry, the price is fixed.' },
  ]},
  { keywords: ['available', 'still', 'sold'], label: '📦 Availability', replies: [
    { icon: '✅', text: 'Yes, it is still available.' },
    { icon: '❌', text: 'Sorry, this item is no longer available.' },
  ]},
  { keywords: ['where', 'location', 'collect', 'meet'], label: '📍 Meeting', replies: [
    { icon: '🏫', text: "Let's meet somewhere on campus. Where is convenient for you?" },
    { icon: '🕐', text: 'When are you free to meet?' },
  ]},
  { keywords: ['condition', 'working', 'photo'], label: '⭐ Condition', replies: [
    { icon: '✅', text: 'You are welcome to check the item in person before buying.' },
    { icon: '📸', text: 'I can share more photos. What would you like to see?' },
  ]},
  { keywords: ['when', 'time', 'today'], label: '📅 Timing', replies: [
    { icon: '📅', text: 'What day and time work for you?' },
  ]},
]

function getQuickReplies(messages, currentUserId, isSeller) {
  const fallback = { label: '💬 Quick Replies', replies: isSeller ? SELLER_DEFAULT_REPLIES : BUYER_REPLIES }
  if (!isSeller) return fallback
  const lastReceived = [...messages].reverse().find(m => m.sender_id !== currentUserId)
  if (!lastReceived) return fallback
  const text = lastReceived.content.toLowerCase()
  return SELLER_TOPICS.find(t => t.keywords.some(k => text.includes(k))) || fallback
}

const isInConversation = (msg, conv) => msg.listing_id === conv.listing_id
  && (msg.sender_id === conv.other_user_id || msg.receiver_id === conv.other_user_id)

// A saved message can arrive twice (send response and live event) but is shown once.
// It takes the place of this tab's temporary copy of the same text, if there is one.
function withMessage(list, msg) {
  if (list.some(m => m.id === msg.id)) return list
  const tempIndex = list.findIndex(m => String(m.id).startsWith('temp-') && m.sender_id === msg.sender_id && m.content === msg.content)
  return tempIndex === -1 ? [...list, msg] : list.map((m, i) => (i === tempIndex ? msg : m))
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
  const [loadError, setLoadError] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const bottomRef = useRef(null)
  // Socket handlers are registered once, so they read the open conversation through a ref.
  const activeConvRef = useRef(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await API.get('/messages/conversations')
      const data = res.data?.conversations
      setConversations(Array.isArray(data) ? data : [])
      setLoadError(false)
    } catch {
      if (!silent) setLoadError(true)
    } finally { if (!silent) setLoading(false) }
  }

  // Opening a thread also marks the messages you received in it as read.
  const fetchThread = async (conv) => {
    const res = await API.get(`/messages/${conv.listing_id}/${conv.other_user_id}`)
    return Array.isArray(res.data) ? res.data : []
  }

  const isStillActive = (conv) => activeConvRef.current?.conversation_id === conv.conversation_id

  const selectConversation = (conv) => {
    activeConvRef.current = conv
    setActiveConv(conv)
  }

  const markRead = (conv) => API.post(`/messages/${conv.listing_id}/${conv.other_user_id}/read`).catch(() => {})

  const reloadActiveThread = async () => {
    const conv = activeConvRef.current
    if (!conv) return
    try {
      const fresh = await fetchThread(conv)
      if (isStillActive(conv)) setMessages(fresh)
    } catch {}
  }

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    fetchConversations()

    const onNewMessage = async (msg) => {
      const conv = activeConvRef.current
      if (conv && isInConversation(msg, conv)) {
        setMessages(prev => withMessage(prev, msg))
        // The conversation is open, so a message from the other person is read on arrival.
        if (msg.sender_id === conv.other_user_id) await markRead(conv)
      }
      fetchConversations(true)
    }
    // Messages were deleted, or live updates were missed while offline.
    const reload = async () => {
      await reloadActiveThread()
      fetchConversations(true)
    }

    socket.on('message:new', onNewMessage)
    socket.on('messages:deleted', reload)
    const stopReconnectReload = onReconnect(reload)
    return () => {
      socket.off('message:new', onNewMessage)
      socket.off('messages:deleted', reload)
      stopReconnectReload()
    }
  }, [])

  const openConversation = async (conv) => {
    selectConversation(conv)
    setShowQuickReplies(false)
    setMessages([])
    try {
      const msgs = await fetchThread(conv)
      if (!isStillActive(conv)) return
      // Keep anything that arrived live while the thread was loading.
      setMessages(prev => prev.reduce(withMessage, msgs))
      fetchConversations(true)
    } catch { toast.error('Failed to load messages') }
  }

  const closeConversation = () => {
    activeConvRef.current = null
    setActiveConv(null)
    setMessages([])
  }

  const refreshMessages = async () => {
    if (!activeConv) return
    setRefreshing(true)
    try {
      const fresh = await fetchThread(activeConv)
      if (isStillActive(activeConv)) setMessages(fresh)
      toast.success('Refreshed!')
    } catch { toast.error('Failed to refresh') }
    finally { setRefreshing(false) }
  }

  const shareContact = () => {
    if (!activeConv) return
    if (!user?.whatsapp) { toast.error('Add your WhatsApp number in Profile first.'); return }
    sendMessage(`📇 Contact Card\n👤 ${user.name}\n✉️ ${user.email}\n📱 +91 ${user.whatsapp}`)
  }

  const deleteConversation = async () => {
    if (!activeConv) return
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    try {
      await API.delete(`/messages/${activeConv.listing_id}/${activeConv.other_user_id}`)
      toast.success('Conversation deleted')
      closeConversation()
    } catch { toast.error('Failed to delete') }
  }

  const sendMessage = async (text) => {
    const msgText = text || input.trim()
    const conv = activeConv
    if (!msgText || !conv || sendingRef.current) return
    sendingRef.current = true
    setInput('')
    setShowQuickReplies(false)
    setSending(true)

    const tempMsg = {
      id: `temp-${Date.now()}`,
      content: msgText,
      sender_id: user.id,
      receiver_id: conv.other_user_id,
      listing_id: conv.listing_id,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const res = await API.post('/messages/', {
        content: msgText,
        listing_id: conv.listing_id,
        receiver_id: conv.other_user_id,
      })
      // The live event for this message (and any automatic first reply) may have come first.
      if (isStillActive(conv)) setMessages(prev => withMessage(prev.filter(m => m.id !== tempMsg.id), res.data))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send')
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      if (!text) setInput(msgText)
    }
    sendingRef.current = false
    setSending(false)
  }

  if (!isAuthenticated) return null

  const lastReceivedMsg = [...messages].reverse().find(m => m.sender_id !== user?.id)
  const isSeller = activeConv?.listing_seller_id === user?.id
  const quickReplies = getQuickReplies(messages, user?.id, isSeller)

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
              <button onClick={() => fetchConversations()} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#00A896' }} title="Refresh">🔄</button>
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
              ) : loadError ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                  <p style={{ color: '#7A9BA8', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Unable to load conversations. Please try again.</p>
                  <button onClick={() => fetchConversations()} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Try again</button>
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
                        <div style={{ fontSize: 12, color: conv.unread_count > 0 ? '#0D2B35' : '#A0BCBB', fontWeight: conv.unread_count > 0 ? 700 : 400, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.last_message}</div>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span style={{ background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', borderRadius: 20, minWidth: 20, height: 20, padding: '0 6px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{conv.unread_count}</span>
                    )}
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
                    <button onClick={closeConversation} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#00A896', flexShrink: 0, padding: 0, lineHeight: 1 }}>←</button>
                  )}

                  <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {activeConv.other_user_name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, color: '#0D2B35', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeConv.other_user_name}</div>
                    <div style={{ fontSize: 11, color: '#00A896', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📦 {activeConv.listing_title}</div>
                    {activeConv.other_user_email && window.innerWidth >= 768 && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                        <a href={'mailto:' + activeConv.other_user_email} style={{ fontSize: 11, color: '#7A9BA8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ✉️ {activeConv.other_user_email}
                        </a>
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#00A896' }}>⚡ {quickReplies.label}</span>
                        {lastReceivedMsg && (
                          <span style={{ fontSize: 11, color: '#A0BCBB', background: '#F0FFFE', padding: '2px 10px', borderRadius: 20, border: '1px solid #E0F5F0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Re: "{lastReceivedMsg.content.length > 25 ? `${lastReceivedMsg.content.substring(0, 25)}...` : lastReceivedMsg.content}"
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                        {quickReplies.replies.map((reply, i) => (
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
                    placeholder={window.innerWidth < 768 ? "Type a message..." : "Type a message or tap ⚡ for quick replies..."}
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
