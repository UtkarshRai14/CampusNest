import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

const categoryEmojis = {
  Books: '📚', Laptop: '💻', Calculator: '🔢',
  'Drawing Instruments': '📐', Stationery: '✏️',
  Fan: '🌀', Cooler: '❄️', 'Hostel Items': '🏠',
  Electronics: '⚡', Other: '📦',
}

function StatCard({ icon, label, value, sub, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, boxShadow: '0 12px 35px rgba(0,201,177,0.15)' }}
      style={{
        background: '#fff', borderRadius: 20, padding: '16px',
        border: '1px solid #D0F5F0',
        boxShadow: '0 4px 20px rgba(0,201,177,0.06)',
        transition: 'all 0.3s',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 26, marginBottom: 16,
      }}>{icon}</div>
      <div style={{
        fontSize: 26, fontWeight: 900, marginBottom: 4,
        background: 'linear-gradient(135deg, #00C9B1, #00A8E8)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>{value}</div>
      <div style={{ fontWeight: 700, color: '#0D2B35', fontSize: 14, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#7A9BA8', fontSize: 12 }}>{sub}</div>
    </motion.div>
  )
}

export default function Analytics() {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()
  const [trending, setTrending] = useState([])
  const [summary, setSummary] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [chart, setChart] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [trendRes, summaryRes] = await Promise.all([
        API.get('/analytics/trending'),
        API.get('/analytics/summary'),
      ])
      const trendData = trendRes.data?.data || trendRes.data || []
      setTrending(Array.isArray(trendData) ? trendData : [])
      setChart(trendRes.data?.chart || null)
      setSummary(summaryRes.data || null)

      if (isAuthenticated && user?.id) {
        const recRes = await API.get(`/analytics/recommendations/${user.id}`)
        const recs = recRes.data?.recommendations || recRes.data || []
        setRecommendations(Array.isArray(recs) ? recs : [])
      }
    } catch (e) {
      console.error('Analytics error:', e)
    } finally {
      setLoading(false)
    }
  }

  const maxCount = Math.max(...trending.map(t => t.count || 0), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE', padding: '20px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#0D2B35', marginBottom: 6 }}>
            📊 Analytics Dashboard
          </h1>
          <p style={{ color: '#7A9BA8', fontSize: 15 }}>
            Live campus marketplace insights · Powered by ML
          </p>
        </motion.div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 20 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #D0F5F0', height: 160,
                background: 'linear-gradient(90deg, #f0fffe 25%, #e8fdfb 50%, #f0fffe 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 20 }}>
                <StatCard icon="📦" label="Total Listings" value={summary.total_listings} sub="Active on platform" color="#E8FBF8" delay={0} />
                <StatCard icon="👥" label="Total Users" value={summary.total_users} sub="IIIT Sonepat students" color="#EBF5FF" delay={0.1} />
                <StatCard icon="🏷️" label="Categories" value={summary.total_categories} sub="Item types available" color="#FFF8E8" delay={0.2} />
                <StatCard icon="💰" label="Avg Price" value={`₹${summary.average_price}`} sub="Across all listings" color="#F5EEFF" delay={0.3} />
              </div>
            )}

            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 20 }}>
              <StatCard icon="🤖" label="Price AI" value="96.76%" sub="Random Forest R² accuracy" color="#E8FBF8" delay={0.4} />
              <StatCard icon="🛡️" label="Spam Detection" value="100%" sub="TF-IDF + Logistic Regression" color="#EBF5FF" delay={0.5} />
              <StatCard icon="🎯" label="Recommender" value="Active" sub="Collaborative filtering" color="#FFF8E8" delay={0.6} />
              <StatCard icon="🎓" label="Programs" value="4" sub="CSE, CSE-DS&A, IT & PhD" color="#F5EEFF" delay={0.7} />
            </div>

            
            {chart && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #D0F5F0', boxShadow: '0 4px 20px rgba(0,201,177,0.07)' }}>
                <h2 style={{ fontWeight: 800, color: '#0D2B35', marginBottom: 20, fontSize: 20 }}>
                  🔥 Trending Categories — Live Chart
                </h2>
                <img src={chart} alt="Trending chart"
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #E0F5F0' }} />
              </motion.div>
            )}

            
            {trending.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #D0F5F0', boxShadow: '0 4px 20px rgba(0,201,177,0.07)' }}>
                <h2 style={{ fontWeight: 800, color: '#0D2B35', marginBottom: 12, fontSize: 17 }}>
                  📈 Category Breakdown
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {trending.map((item, i) => (
                    <motion.div key={item.category}
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                    >
                      <div style={{ width: 32, textAlign: 'center', fontSize: 20, flexShrink: 0 }}>
                        {categoryEmojis[item.category] || '📦'}
                      </div>
                      <div style={{ width: 160, fontSize: 14, fontWeight: 600, color: '#0D2B35', flexShrink: 0 }}>
                        {item.category}
                      </div>
                      <div style={{ flex: 1, height: 12, background: '#F0FFFE', borderRadius: 6, overflow: 'hidden', border: '1px solid #D0F5F0' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / maxCount) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.5 + i * 0.06 }}
                          style={{
                            height: '100%', borderRadius: 6,
                            background: i === 0
                              ? 'linear-gradient(90deg, #00C9B1, #00A8E8)'
                              : 'linear-gradient(90deg, #00C9B1aa, #00A896aa)',
                          }}
                        />
                      </div>
                      <div style={{ width: 80, textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#00A896', flexShrink: 0 }}>
                        {item.count} listing{item.count !== 1 ? 's' : ''}
                        {i === 0 && <span style={{ marginLeft: 4, fontSize: 11, background: '#FFF8E8', color: '#CC8800', padding: '1px 6px', borderRadius: 10 }}>🏆</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            
            {isAuthenticated && recommendations.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #D0F5F0', boxShadow: '0 4px 20px rgba(0,201,177,0.07)' }}>
                <h2 style={{ fontWeight: 800, color: '#0D2B35', marginBottom: 6, fontSize: 20 }}>
                  ✨ Recommended for You
                </h2>
                <p style={{ color: '#7A9BA8', fontSize: 14, marginBottom: 24 }}>
                  Based on your department and semester · ML powered
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 16 }}>
                  {recommendations.map((item, i) => (
                    <motion.div key={item.id || i}
                      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,201,177,0.15)' }}
                      onClick={() => navigate(`/listings/${item.id}`)}
                      style={{
                        background: '#F8FFFE', borderRadius: 14, padding: 18,
                        border: '1px solid #D0F5F0', cursor: 'pointer', transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E8FBF8', color: '#00A896', fontWeight: 700 }}>
                          {item.listing_type?.toUpperCase()}
                        </span>
                        <span style={{ fontWeight: 800, color: '#00A896' }}>₹{item.price}</span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0D2B35', fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ color: '#7A9BA8', fontSize: 12 }}>{item.category}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            
            {!isAuthenticated && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  background: 'linear-gradient(135deg, #00C9B1, #00A8E8)',
                  borderRadius: 20, padding: 32, textAlign: 'center', color: '#fff',
                }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
                <h3 style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Get Personalized Recommendations</h3>
                <p style={{ opacity: 0.85, marginBottom: 20 }}>Login to see AI-powered listing recommendations based on your department and semester</p>
                <Link to="/login" style={{
                  display: 'inline-block', padding: '12px 28px', borderRadius: 10,
                  background: '#fff', color: '#00A896', fontWeight: 800,
                  textDecoration: 'none', fontSize: 15,
                }}>Login to See Recommendations</Link>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
