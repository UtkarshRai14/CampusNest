import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

const suggestions = [
  'What books do I need for IT Sem 3?',
  'Who is selling a calculator near me?',
  'How does price prediction work?',
  'What is the borrow feature?',
]

const agentSuggestions = [
  '🧾 Draft: sell my calculator, good condition, 150 rupees',
  '🔍 Search: find a laptop under 10000 rupees',
]

export default function ARIAChat() {
  const [open, setOpen] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [messages, setMessages] = useState([
    { role: 'aria', text: "Hi! I'm ARIA 🤖 — your IIIT Sonepat campus AI assistant. Ask me anything about listings, books, departments, or campus life!" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [postingIndex, setPostingIndex] = useState(null)
  const [postedIndexes, setPostedIndexes] = useState([])
  const bottomRef = useRef(null)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendRegular = async (msg) => {
    setLoading(true)
    try {
      const endpoint = isAuthenticated ? '/chat/' : '/chat/guest'
      const res = await API.post(endpoint, { message: msg })
      setMessages(prev => [...prev, { role: 'aria', text: res.data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'aria', text: "Sorry, I'm having trouble connecting right now. Please try again!" }])
    } finally {
      setLoading(false)
    }
  }

  const sendAgent = async (msg) => {
    setLoading(true)
    const isSearch = msg.toLowerCase().includes('find') || msg.toLowerCase().includes('search') || msg.toLowerCase().includes('looking for')
    try {
      const endpoint = isSearch ? '/chat/agent/search' : '/chat/agent'
      const res = await API.post(endpoint, { message: msg })
      setMessages(prev => [...prev, {
        role: 'agent',
        text: res.data.summary,
        steps: res.data.agent_steps,
        draft: res.data.draft || null,
        matches: res.data.matches || null,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'aria', text: "Agent ran into an issue. Please try rephrasing your request." }])
    } finally {
      setLoading(false)
    }
  }

  const postDraft = async (draft, index) => {
    setPostingIndex(index)
    try {
      const formData = new FormData()
      formData.append('title', draft.title)
      formData.append('description', `Posted via ARIA Agent. AI-suggested price range: ${draft.price_range}`)
      formData.append('price', draft.suggested_price)
      formData.append('condition', draft.condition)
      formData.append('category', draft.category)
      formData.append('listing_type', draft.listing_type)

      await API.post('/listings/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setPostedIndexes(prev => [...prev, index])
      setMessages(prev => [...prev, { role: 'aria', text: '✅ Done! Your listing has been posted to CampusNest.' }])
    } catch (err) {
      const detail = err.response?.data?.detail
      setMessages(prev => [...prev, { role: 'aria', text: typeof detail === 'string' ? `Couldn't post: ${detail}` : "Sorry, I couldn't post that listing. Please try the Post Listing page instead." }])
    } finally {
      setPostingIndex(null)
    }
  }

  const send = async (text) => {
    const msg = (text || input).replace(/^🧾 Draft:\s*/i, '').replace(/^🔍 Search:\s*/i, '').trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    if (agentMode) {
      await sendAgent(msg)
    } else {
      await sendRegular(msg)
    }
  }

  const cardStyle = {
    marginTop: 8, padding: isMobile ? '10px 12px' : '12px 14px',
    borderRadius: 14, background: '#fff', border: '1.5px solid #B2EFE8',
  }

  return (
    <>
      
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'fixed', bottom: 20, right: 16, zIndex: 9999,
          width: isMobile ? 52 : 60, height: isMobile ? 52 : 60, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #00C9B1, #00A896)',
          boxShadow: '0 6px 24px rgba(0,201,177,0.5)',
          cursor: 'pointer', fontSize: isMobile ? 22 : 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {open ? '✕' : '🤖'}
      </motion.button>

      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed', bottom: isMobile ? 80 : 100, right: isMobile ? 8 : 12, zIndex: 9998,
              width: isMobile ? 'calc(100vw - 16px)' : 'min(380px, calc(100vw - 24px))',
              height: isMobile ? 'min(75vh, 560px)' : 'min(560px, calc(100vh - 140px))',
              borderRadius: 24,
              background: '#fff', border: '1px solid #D0F5F0',
              boxShadow: '0 20px 60px rgba(0,201,177,0.2)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            
            <div style={{
              background: 'linear-gradient(135deg, #00C9B1, #00A896)',
              padding: isMobile ? '12px 14px' : '18px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? 17 : 20, flexShrink: 0,
              }}>🤖</div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: isMobile ? 14 : 16 }}>ARIA</div>
                <div style={{ fontSize: isMobile ? 10 : 12, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                  {agentMode ? '🤖 Agent Mode • Autonomous' : 'IIIT Sonepat Campus AI • Online'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#7DFFEA', flexShrink: 0 }} />
            </div>

            
            <div style={{
              padding: isMobile ? '8px 12px' : '10px 16px',
              borderBottom: '1px solid #E0F5F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: agentMode ? '#F0FFFE' : '#FAFFFE',
              transition: 'background 0.2s',
            }}>
              <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: agentMode ? '#00A896' : '#7A9BA8' }}>
                {agentMode ? '🤖 Agent Mode ON — autonomous actions' : 'Chat Mode'}
              </span>
              <button
                onClick={() => setAgentMode(a => !a)}
                style={{
                  width: 40, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: agentMode ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#E0F5F0',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <motion.div
                  animate={{ x: agentMode ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                />
              </button>
            </div>

            
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  <div style={{
                    maxWidth: isMobile ? '88%' : '82%', padding: isMobile ? '9px 12px' : '10px 14px', borderRadius: 16,
                    borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                    borderBottomLeftRadius: m.role !== 'user' ? 4 : 16,
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, #00C9B1, #00A896)'
                      : m.role === 'agent' ? '#FFFBEB' : '#F5FFFE',
                    color: m.role === 'user' ? '#fff' : '#0D2B35',
                    fontSize: isMobile ? 13 : 14, lineHeight: 1.5,
                    border: m.role === 'aria' ? '1px solid #D0F5F0' : m.role === 'agent' ? '1.5px solid #FBBF24' : 'none',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    {m.role === 'agent' && (
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#B45309', marginBottom: 6, letterSpacing: 0.5 }}>
                        🤖 AGENT MODE
                      </div>
                    )}
                    {m.text}

                    
                    {m.steps && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #FBBF24', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {m.steps.map((s, idx) => (
                          <div key={idx} style={{ fontSize: isMobile ? 11 : 12, color: '#92400E' }}>{s}</div>
                        ))}
                      </div>
                    )}

                    
                    {m.draft && (
                      <div style={cardStyle}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#00A896', marginBottom: 6 }}>📝 DRAFT LISTING</div>
                        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: '#0D2B35', marginBottom: 4 }}>{m.draft.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 11 : 12, color: '#7A9BA8' }}>
                          <span>{m.draft.category} · Condition {m.draft.condition}/5</span>
                          <span style={{ fontWeight: 800, color: '#00A896' }}>₹{m.draft.suggested_price}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#A0BCBB', marginTop: 2 }}>Fair range: {m.draft.price_range}</div>

                        {postedIndexes.includes(i) ? (
                          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: '#E8FBF8', color: '#00A896', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                            ✅ Posted to CampusNest
                          </div>
                        ) : (
                          <button
                            onClick={() => postDraft(m.draft, i)}
                            disabled={postingIndex === i}
                            style={{
                              marginTop: 8, width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none',
                              background: postingIndex === i ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)',
                              color: '#fff', fontSize: 12, fontWeight: 700, cursor: postingIndex === i ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {postingIndex === i ? '⏳ Posting...' : '✅ Confirm & Post Listing'}
                          </button>
                        )}
                      </div>
                    )}

                    
                    {m.matches && m.matches.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {m.matches.map((item) => (
                          <a key={item.id} href={`/listings/${item.id}`} style={{ textDecoration: 'none' }}>
                            <div style={cardStyle}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: '#0D2B35', flex: 1, marginRight: 8 }}>
                                  {item.title?.substring(0, isMobile ? 28 : 40)}{item.title?.length > (isMobile ? 28 : 40) ? '...' : ''}
                                </span>
                                <span style={{ fontWeight: 800, color: '#00A896', fontSize: isMobile ? 12 : 13, flexShrink: 0 }}>₹{item.price}</span>
                              </div>
                              <div style={{ fontSize: 11, color: '#A0BCBB', marginTop: 3 }}>{item.category} · Condition {item.condition}/5</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: agentMode ? '#FFFBEB' : '#F5FFFE', borderRadius: 16, width: 'fit-content', border: `1px solid ${agentMode ? '#FBBF24' : '#D0F5F0'}` }}>
                  {[0,1,2].map(i => (
                    <motion.div key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: agentMode ? '#FBBF24' : '#00C9B1' }}
                    />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            
            {messages.length <= 1 && (
              <div style={{ padding: isMobile ? '0 10px 6px' : '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(agentMode ? agentSuggestions : suggestions).map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    padding: isMobile ? '4px 10px' : '5px 12px', borderRadius: 20,
                    border: `1px solid ${agentMode ? '#FBBF24' : '#B2EFE8'}`,
                    background: agentMode ? '#FFFBEB' : '#F0FFFE',
                    color: agentMode ? '#B45309' : '#00A896', fontSize: isMobile ? 11 : 12,
                    fontWeight: 500, cursor: 'pointer',
                  }}>{s}</button>
                ))}
              </div>
            )}

            
            <div style={{
              padding: isMobile ? '10px 12px' : '12px 16px', borderTop: '1px solid #E0F5F0',
              display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center',
              background: '#fff',
            }}>
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={agentMode ? "Tell the agent what to do..." : "Ask ARIA anything..."}
                style={{
                  flex: 1, minWidth: 0, padding: isMobile ? '9px 12px' : '10px 14px', borderRadius: 20,
                  border: `1.5px solid ${agentMode ? '#FBBF24' : '#D0ECE8'}`, outline: 'none',
                  fontSize: isMobile ? 13 : 14, color: '#0D2B35', background: '#F8FFFE',
                }}
              />
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                onClick={() => send()}
                style={{
                  width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: '50%', border: 'none',
                  background: agentMode ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : 'linear-gradient(135deg, #00C9B1, #00A896)',
                  color: '#fff', fontSize: isMobile ? 16 : 18, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
                }}
              >↑</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
