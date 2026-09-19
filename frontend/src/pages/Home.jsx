import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import API from '../api/axios'


function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return { count, ref }
}

const categories = [
  { name: 'All', icon: '🏬' }, { name: 'Books', icon: '📚' },
  { name: 'Laptop', icon: '💻' }, { name: 'Calculator', icon: '🔢' },
  { name: 'Drawing Instruments', icon: '📐' }, { name: 'Stationery', icon: '✏️' },
  { name: 'Fan', icon: '🌀' }, { name: 'Cooler', icon: '❄️' },
  { name: 'Hostel Items', icon: '🏠' }, { name: 'Electronics', icon: '⚡' },
]

const features = [
  { icon: '🤖', title: 'ARIA AI Chatbot', desc: 'Ask anything about campus — books, sellers, departments, semester queries', color: '#E0FBF8' },
  { icon: '💰', title: 'Fair Price AI', desc: 'ML model (R²=96.76%) predicts the right price for your item instantly', color: '#E8F8FF' },
  { icon: '🔄', title: '4 Trade Modes', desc: 'Buy · Sell · Rent · Borrow · Skill-Swap all in one campus platform', color: '#F0FFF4' },
  { icon: '🎓', title: 'IIIT Sonepat Exclusive', desc: 'Verified IIIT Sonepat students only — safe, trusted, campus-specific', color: '#FFF8E8' },
]

const typeColors = {
  sell: { bg: '#E8FBF8', color: '#00A896' },
  rent: { bg: '#EBF5FF', color: '#0080CC' },
  borrow: { bg: '#FFF8E8', color: '#CC8800' },
  swap: { bg: '#F5EEFF', color: '#7B2FBE' },
}


function FadeIn({ children, delay = 0, direction = 'up' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const variants = {
    hidden: { opacity: 0, y: direction === 'up' ? 40 : direction === 'down' ? -40 : 0, x: direction === 'left' ? 40 : direction === 'right' ? -40 : 0 },
    visible: { opacity: 1, y: 0, x: 0 },
  }
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"}
      variants={variants} transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}>
      {children}
    </motion.div>
  )
}


function StatCounter({ value, suffix = '', prefix = '', label, delay = 0 }) {
  const numeric = parseInt(value.toString().replace(/[^0-9]/g, '')) || 0
  const { count, ref } = useCounter(numeric, 2000)
  const inView = useInView(ref, { once: true })

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, delay, type: 'spring', bounce: 0.4 }}
        style={{ fontSize: 42, fontWeight: 900, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
        {prefix}{count}{suffix}
      </motion.div>
      <div style={{ color: '#7A9BA8', fontSize: 13, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

export default function Home() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768)
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [listings, setListings] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroRef = useRef(null)

  useEffect(() => {
    API.get('/listings/').then(r => setListings(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  const filtered = activeCategory === 'All' ? listings : listings.filter(l => l.category === activeCategory)

  return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE', overflow: 'hidden' }}>

      
      <section ref={heroRef} style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #FFFFFF 0%, #E8FDFB 40%, #D0F8F3 100%)',
        display: 'flex', alignItems: 'center', padding: '0',
        minHeight: isMobile ? 'unset' : '92vh',
      }}>
        
        <motion.div
          animate={{ x: mousePos.x * 0.02, y: mousePos.y * 0.02 }}
          transition={{ type: 'spring', stiffness: 50, damping: 30 }}
          style={{ position: 'absolute', top: '-10%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,201,177,0.12) 0%, transparent 70%)', pointerEvents: 'none' }}
        />
        <motion.div
          animate={{ x: mousePos.x * -0.01, y: mousePos.y * -0.015 }}
          transition={{ type: 'spring', stiffness: 30, damping: 20 }}
          style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,168,232,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}
        />

        <div className='hero-inner' style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', gap: isMobile ? 16 : 60, padding: isMobile ? '16px 20px' : '0 48px', textAlign: isMobile ? 'center' : 'left' }}>

          
          <div style={{ maxWidth: isMobile ? '100%' : 580, display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start' }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,201,177,0.1)', border: '1px solid rgba(0,201,177,0.3)', borderRadius: 24, padding: '6px 16px', fontSize: 13, color: '#00A896', fontWeight: 600, marginBottom: isMobile ? 12 : 28 }}>
              🎓 Exclusively for IIIT Sonepat Students
            </motion.div>

            <div style={{ overflow: 'hidden', marginBottom: 20 }}>
              <motion.h1
                initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ fontSize: 'clamp(40px,5.5vw,68px)', fontWeight: 900, lineHeight: 1.08, color: '#0D2B35', margin: 0 }}>
                Campus Economy,
              </motion.h1>
            </div>

            <div style={{ overflow: 'hidden', marginBottom: 28 }}>
              <motion.h1
                initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ fontSize: 'clamp(40px,5.5vw,68px)', fontWeight: 900, lineHeight: 1.08, margin: 0, background: 'linear-gradient(135deg, #00C9B1 0%, #00A8E8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Powered by AI.
              </motion.h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
              style={{ fontSize: 18, color: '#4A6572', lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
              Buy, Sell, Rent, Borrow & Skill-Swap within your campus — with AI price prediction, ARIA chatbot, and smart recommendations.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.65 }}
              className='hero-buttons' style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, width: isMobile ? '100%' : 'auto' }}>
              <Link to="/listings" style={{ textDecoration: 'none', padding: '15px 34px', borderRadius: 12, background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, fontSize: 16, boxShadow: '0 8px 25px rgba(0,201,177,0.4)', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,201,177,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,201,177,0.4)' }}>
                Browse Listings →
              </Link>
              <Link to="/post" style={{ textDecoration: 'none', padding: '15px 34px', borderRadius: 12, border: '2px solid #00C9B1', color: '#00A896', fontWeight: 600, fontSize: 16, background: '#fff', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,201,177,0.05)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none' }}>
                Post a Listing
              </Link>
            </motion.div>
          </div>


          
          <motion.div
            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            style={{ position: 'relative', width: 420, height: 420, flexShrink: 0, display: isMobile ? 'none' : 'block' }}>

            
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              style={{ position: 'absolute', top: '15%', left: '10%', width: 260, background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 20px 60px rgba(0,201,177,0.2)', border: '1px solid #D0F5F0', zIndex: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #00C9B1, #00A8E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📚</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0D2B35', fontSize: 14 }}>RD Sharma Maths</div>
                  <div style={{ fontSize: 12, color: '#7A9BA8' }}>Sem 3 · Like New</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, background: '#E8FBF8', color: '#00A896', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>SELL</span>
                <span style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(135deg, #00C9B1, #00A896)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>₹280</span>
              </div>
              
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F8F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🤖</span>
                <span style={{ fontSize: 11, color: '#00A896', fontWeight: 700 }}>✅ AI Verified · 98% Safe</span>
              </div>
            </motion.div>

            
            <motion.div
              animate={{ y: [6, -6, 6] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
              style={{ position: 'absolute', top: '5%', right: '0%', background: 'linear-gradient(135deg, #00C9B1, #00A896)', borderRadius: 20, padding: '16px 20px', boxShadow: '0 12px 40px rgba(0,201,177,0.4)', zIndex: 4 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>AI Price Prediction</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>₹280</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>96.76% accurate 🎯</div>
            </motion.div>

            
            <motion.div
              animate={{ y: [-5, 10, -5] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              style={{ position: 'absolute', bottom: '10%', right: '5%', width: 200, background: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 16px 40px rgba(0,168,232,0.2)', border: '1px solid #E0F5F0', zIndex: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EBF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💻</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0D2B35', fontSize: 13 }}>HP Laptop</div>
                  <div style={{ fontSize: 11, color: '#7A9BA8' }}>Borrow · ₹200/day</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C9B1' }} />
                <span style={{ fontSize: 11, color: '#00A896', fontWeight: 600 }}>Available Now</span>
              </div>
            </motion.div>

            
            <motion.div
              animate={{ y: [4, -10, 4] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1.5 }}
              style={{ position: 'absolute', bottom: '30%', left: '0%', background: '#0D2B35', borderRadius: 20, borderBottomLeftRadius: 4, padding: '12px 16px', boxShadow: '0 12px 30px rgba(13,43,53,0.25)', zIndex: 4, maxWidth: 180 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>🤖 ARIA says</div>
              <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>Found 3 calculators near you! ₹100/day</div>
            </motion.div>

            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              style={{ position: 'absolute', top: '20%', left: '20%', width: 220, height: 220, borderRadius: '50%', border: '2px dashed rgba(0,201,177,0.2)', zIndex: 1 }} />

            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              style={{ position: 'absolute', top: '30%', left: '30%', width: 140, height: 140, borderRadius: '50%', border: '2px dashed rgba(0,168,232,0.15)', zIndex: 1 }} />
          </motion.div>

        </div>

        
        <motion.div
          animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
          <span style={{ fontSize: 11, color: '#A0BCBB', fontWeight: 600, letterSpacing: 1 }}>SCROLL</span>
          <div style={{ width: 24, height: 40, border: '2px solid #D0ECE8', borderRadius: 12, display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ width: 4, height: 8, background: '#00C9B1', borderRadius: 2 }} />
          </div>
        </motion.div>
      </section>

      
      <section style={{ padding: "clamp(60px, 8vw, 100px) clamp(20px, 5vw, 48px)", maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#00A896', textTransform: 'uppercase' }}>Why CampusNest</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#0D2B35', textAlign: 'center', marginBottom: 16, lineHeight: 1.2 }}>
            Built for IIIT Sonepat students,<br />shaped by real campus needs.
          </h2>
          <p style={{ textAlign: 'center', color: '#6A8A96', marginBottom: 64, fontSize: 17 }}>
            Every feature designed around campus life.
          </p>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <FadeIn key={i} delay={i * 0.12} direction="up">
              <motion.div
                whileHover={{ y: -8, boxShadow: '0 20px 50px rgba(0,201,177,0.18)' }}
                style={{ background: '#fff', borderRadius: 20, padding: 32, border: '1px solid #E0F5F0', boxShadow: '0 4px 20px rgba(0,201,177,0.07)', transition: 'box-shadow 0.3s', height: '100%' }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 800, color: '#0D2B35', marginBottom: 10, fontSize: 18 }}>{f.title}</h3>
                <p style={{ color: '#6A8A96', fontSize: 15, lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </section>

      
      <section style={{ padding: "0 clamp(20px, 5vw, 48px) clamp(60px, 8vw, 100px)", maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#00A896', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Marketplace</span>
              <h2 style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 900, color: '#0D2B35', margin: 0 }}>Browse Listings</h2>
            </div>
            <Link to="/listings" style={{ textDecoration: 'none', color: '#00A896', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              View all listings →
            </Link>
          </div>
        </FadeIn>

        
        <FadeIn delay={0.1}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 40 }}>
            {categories.map((c, i) => (
              <motion.button key={c.name}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(c.name)} style={{
                  padding: '8px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  background: activeCategory === c.name ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#fff',
                  color: activeCategory === c.name ? '#fff' : '#4A6572',
                  fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                  boxShadow: activeCategory === c.name ? '0 4px 15px rgba(0,201,177,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
                  border: activeCategory === c.name ? 'none' : '1px solid #E0F5F0',
                }}>
                {c.icon} {c.name}
              </motion.button>
            ))}
          </div>
        </FadeIn>

        
        {filtered.length === 0 ? (
          <FadeIn>
            <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: 24, border: '1px dashed #B2EFE8' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
              <p style={{ color: '#7A9BA8', fontSize: 16 }}>
                No listings yet. <Link to="/post" style={{ color: '#00C9B1', fontWeight: 600 }}>Be the first!</Link>
              </p>
            </div>
          </FadeIn>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 22 }}>
            {filtered.slice(0, 8).map((item, i) => {
              const tc = typeColors[item.listing_type] || typeColors.sell
              return (
                <FadeIn key={item.id} delay={i * 0.06} direction="up">
                  <Link to={"/listings/" + item.id} style={{ textDecoration: 'none' }}>
                    <motion.div whileHover={{ y: -8, boxShadow: '0 20px 50px rgba(0,201,177,0.18)' }}
                      style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid #E0F5F0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', transition: 'box-shadow 0.3s', cursor: 'pointer' }}>
                      <div style={{ height: 190, background: '#F8FFFE', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} />
                        ) : (
                          <span style={{ fontSize: 52, opacity: 0.3 }}>📦</span>
                        )}
                        <div style={{ position: 'absolute', top: 10, left: 10, background: tc.bg, color: tc.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                          {item.listing_type?.toUpperCase()}
                        </div>
                        {item.verification_label && (
                          <div style={{ position: 'absolute', bottom: 10, left: 10, background: item.verification_bg || '#E8FBF8', color: item.verification_color || '#00A896', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                            {item.verification_label}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '18px 20px' }}>
                        <h3 style={{ fontWeight: 700, color: '#0D2B35', marginBottom: 8, fontSize: 15, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#7A9BA8', fontSize: 13 }}>{item.category}</span>
                          <span style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(135deg, #00C9B1, #00A896)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {item.price === 1 ? 'Negotiate' : "₹" + item.price}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </FadeIn>
              )
            })}
          </div>
        )}

        {filtered.length > 8 && (
          <FadeIn delay={0.3}>
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Link to="/listings" style={{ textDecoration: 'none', padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', fontWeight: 700, fontSize: 16, boxShadow: '0 8px 25px rgba(0,201,177,0.35)' }}>
                View All {filtered.length} Listings →
              </Link>
            </div>
          </FadeIn>
        )}
      </section>

      
      <section style={{ margin: "0 clamp(16px, 4vw, 48px) 80px", borderRadius: 28, overflow: 'hidden', position: 'relative' }}>
        <FadeIn>
          <div style={{ background: 'linear-gradient(135deg, #00C9B1 0%, #00A8E8 100%)', padding: '80px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ repeat: Infinity, duration: 4 }}
              style={{ position: 'absolute', top: '-30%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }} transition={{ repeat: Infinity, duration: 5 }}
              style={{ position: 'absolute', bottom: '-30%', left: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#fff', marginBottom: 16, lineHeight: 1.2 }}>
                  Have something to sell?<br />Start earning today.
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 17, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
                  Join your fellow IIIT Sonepat students buying and selling on CampusNest.
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/post" style={{ textDecoration: 'none', padding: '15px 36px', borderRadius: 12, background: '#fff', color: '#00A896', fontWeight: 800, fontSize: 16, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}>
                    Post a Listing Free →
                  </Link>
                  <Link to="/listings" style={{ textDecoration: 'none', padding: '15px 36px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.6)', color: '#fff', fontWeight: 600, fontSize: 16 }}>
                    Browse First
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </FadeIn>
      </section>

      
      <footer style={{ background: '#0D2B35', padding: "clamp(24px, 5vw, 48px)", textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>🎓 CampusNest</div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Built with ❤️ for IIIT Sonepat students</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 20 }}>
          {['Home', 'Browse', 'Post Listing', 'Analytics'].map(link => (
            <Link key={link} to={link === 'Home' ? '/' : link === 'Browse' ? '/listings' : link === 'Post Listing' ? '/post' : '/analytics'} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              {link}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
