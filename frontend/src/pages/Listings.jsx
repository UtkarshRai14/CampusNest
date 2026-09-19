import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import API from '../api/axios'

const categories = [
  { name: 'All', icon: '🏬' },
  { name: 'Books', icon: '📚' },
  { name: 'Laptop', icon: '💻' },
  { name: 'Calculator', icon: '🔢' },
  { name: 'Drawing Instruments', icon: '📐' },
  { name: 'Stationery', icon: '✏️' },
  { name: 'Fan', icon: '🌀' },
  { name: 'Cooler', icon: '❄️' },
  { name: 'Hostel Items', icon: '🏠' },
  { name: 'Electronics', icon: '⚡' },
]

const listingTypes = ['All Types', 'sell', 'rent', 'borrow', 'swap']

const typeConfig = {
  sell:   { bg: '#E8FBF8', color: '#00A896', label: '💰 Sell',   border: '#B2EFE8' },
  rent:   { bg: '#EBF5FF', color: '#0080CC', label: '🔑 Rent',   border: '#B2D8F5' },
  borrow: { bg: '#FFF8E8', color: '#CC8800', label: '🤝 Borrow', border: '#F5DFA0' },
  swap:   { bg: '#F5EEFF', color: '#7B2FBE', label: '🔄 Swap',   border: '#D4B8F5' },
}


function SkeletonCard() {
  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      border: '1px solid #E0F5F0',
    }}>
      <div style={{
        height: 200, background: 'linear-gradient(90deg, #f0fffe 25%, #e0fbf8 50%, #f0fffe 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }} />
      <div style={{ padding: 18 }}>
        <div style={{ height: 12, background: '#E8F5F2', borderRadius: 6, marginBottom: 10, width: '40%' }} />
        <div style={{ height: 16, background: '#E8F5F2', borderRadius: 6, marginBottom: 8, width: '85%' }} />
        <div style={{ height: 13, background: '#E8F5F2', borderRadius: 6, width: '60%' }} />
      </div>
    </div>
  )
}


function ListingCard({ item, index }) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const tc = typeConfig[item.listing_type] || typeConfig.sell

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      whileHover={{ y: -6 }}
      style={{ transition: 'box-shadow 0.3s' }}
    >
      <Link to={`/listings/${item.id}`} style={{ textDecoration: 'none' }}>
        <div style={{
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          border: '1px solid #E0F5F0',
          boxShadow: '0 2px 16px rgba(0,201,177,0.06)',
          transition: 'all 0.3s',
          cursor: 'pointer', height: '100%',
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,201,177,0.18)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,201,177,0.06)'}
        >
          
          <div style={{
            height: 200, background: '#F8FFFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            {!imgLoaded && !imgError && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, #f0fffe 25%, #e8fdfb 50%, #f0fffe 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
            )}
            {!imgError && item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  padding: 12,
                  opacity: imgLoaded ? 1 : 0,
                  transition: 'opacity 0.3s',
                }}
              />
            ) : (
              <div style={{ fontSize: 52, opacity: 0.4 }}>
                {categories.find(c => c.name === item.category)?.icon || '📦'}
              </div>
            )}

            
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: tc.bg, color: tc.color,
              border: `1px solid ${tc.border}`,
              borderRadius: 20, padding: '3px 10px',
              fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
              backdropFilter: 'blur(8px)',
            }}>
              {tc.label}
            </div>

            
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 20, padding: '3px 10px',
              fontSize: 11, fontWeight: 600, color: '#4A6572',
              backdropFilter: 'blur(8px)',
              border: '1px solid #E0F5F0',
            }}>
              {'⭐'.repeat(item.condition)}
            </div>
          </div>

          
          <div style={{ padding: '16px 18px 18px' }}>
            <h3 style={{
              fontWeight: 700, color: '#0D2B35', fontSize: 14,
              lineHeight: 1.4, marginBottom: 8,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{item.title}</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div>
                <div style={{
                  fontSize: 20, fontWeight: 900,
                  background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {item.price === 1 ? 'Negotiable' : `₹${item.price}`}
                  {item.listing_type === 'rent' && <span style={{ fontSize: 11, WebkitTextFillColor: '#7A9BA8' }}>/mo</span>}
                  {item.listing_type === 'borrow' && <span style={{ fontSize: 11, WebkitTextFillColor: '#7A9BA8' }}>/day</span>}
                </div>
                <div style={{ fontSize: 12, color: '#A0BCBB', marginTop: 2 }}>
                  {item.category}
                </div>
              </div>

              
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, boxShadow: '0 4px 12px rgba(0,201,177,0.3)',
              }}>→</div>
            </div>

            
            {item.seller_name && (
              <div style={{
                marginTop: 12, paddingTop: 12,
                borderTop: '1px solid #F0F8F6',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00C9B1, #00A8E8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0,
                }}>
                  {item.seller_name[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: 12, color: '#7A9BA8', fontWeight: 500 }}>
                  {item.seller_name}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function Listings() {
  const [searchParams] = useSearchParams()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'All')
  const [activeType, setActiveType] = useState('All Types')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minCondition, setMinCondition] = useState(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('newest')
  const searchTimer = useRef(null)

  
  const handleSearchInput = (val) => {
    setSearchInput(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(val), 400)
  }

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (activeCategory !== 'All') params.category = activeCategory
    if (activeType !== 'All Types') params.listing_type = activeType
    if (minPrice) params.min_price = minPrice
    if (maxPrice) params.max_price = maxPrice
    if (minCondition) params.min_condition = minCondition
    if (search) params.search = search

    API.get('/listings/', { params })
      .then(r => {
        let data = Array.isArray(r.data) ? r.data : []
        
        if (sortBy === 'price_low') data = [...data].sort((a, b) => a.price - b.price)
        if (sortBy === 'price_high') data = [...data].sort((a, b) => b.price - a.price)
        if (sortBy === 'condition') data = [...data].sort((a, b) => b.condition - a.condition)
        setListings(data)
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [activeCategory, activeType, minPrice, maxPrice, minCondition, search, sortBy])

  const clearFilters = () => {
    setActiveCategory('All')
    setActiveType('All Types')
    setMinPrice('')
    setMaxPrice('')
    setMinCondition(null)
    setSearch('')
    setSearchInput('')
    setSortBy('newest')
  }

  const activeFiltersCount = [
    activeCategory !== 'All',
    activeType !== 'All Types',
    minPrice, maxPrice, minCondition,
  ].filter(Boolean).length

  return (
    <div style={{ minHeight: '100vh', background: '#F5FFFE' }}>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .cat-pill:hover {
          background: rgba(0,201,177,0.1) !important;
          color: #00A896 !important;
        }
      `}</style>

      
      <div style={{
        background: '#fff', borderBottom: '1px solid #D0F5F0',
        padding: '14px 32px',
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search listings, books, electronics..."
            style={{
              width: '100%', padding: '11px 16px 11px 40px',
              borderRadius: 12, border: '1.5px solid #D0ECE8',
              outline: 'none', fontSize: 14, color: '#0D2B35',
              background: '#F8FFFE', boxSizing: 'border-box',
              transition: 'all 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = '#00C9B1'; e.target.style.boxShadow = '0 0 0 3px rgba(0,201,177,0.1)' }}
            onBlur={e => { e.target.style.borderColor = '#D0ECE8'; e.target.style.boxShadow = 'none' }}
          />
          {searchInput && (
            <button onClick={() => handleSearchInput('')} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#A0BCBB', fontSize: 16,
            }}>✕</button>
          )}
        </div>

        
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          padding: '10px 14px', borderRadius: 10, border: '1.5px solid #D0ECE8',
          background: '#fff', color: '#0D2B35', fontSize: 14, cursor: 'pointer', outline: 'none',
        }}>
          <option value="newest">🕐 Newest First</option>
          <option value="price_low">💰 Price: Low to High</option>
          <option value="price_high">💰 Price: High to Low</option>
          <option value="condition">⭐ Best Condition</option>
        </select>

        
        <div style={{ display: 'flex', gap: 4, background: '#F0FFFE', borderRadius: 10, padding: 4, border: '1px solid #D0F5F0' }}>
          {[['grid', '⊞'], ['list', '☰']].map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              width: 36, height: 36, borderRadius: 8, border: 'none',
              background: viewMode === mode ? 'linear-gradient(135deg, #00C9B1, #00A896)' : 'transparent',
              color: viewMode === mode ? '#fff' : '#7A9BA8',
              cursor: 'pointer', fontSize: 16, transition: 'all 0.2s',
            }}>{icon}</button>
          ))}
        </div>

        
        <div style={{ color: '#7A9BA8', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
          {loading ? '...' : `${listings.length} listing${listings.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      
      <div style={{
        background: '#fff', borderBottom: '1px solid #D0F5F0',
        padding: '0 32px', display: 'flex', gap: 4,
        overflowX: 'auto', height: 52, alignItems: 'center',
        scrollbarWidth: 'none',
      }}>
        {categories.map(c => (
          <button key={c.name} className="cat-pill" onClick={() => setActiveCategory(c.name)} style={{
            padding: '6px 16px', borderRadius: 20, border: 'none',
            background: activeCategory === c.name
              ? 'linear-gradient(135deg, #00C9B1, #00A896)' : 'transparent',
            color: activeCategory === c.name ? '#fff' : '#4A6572',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'all 0.2s',
            boxShadow: activeCategory === c.name ? '0 3px 10px rgba(0,201,177,0.3)' : 'none',
          }}>{c.icon} {c.name}</button>
        ))}
      </div>

      <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto', padding: '24px 16px', gap: 24, flexWrap: 'wrap' }}>

        
        <motion.aside
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className='listings-sidebar' style={{
            width: 230, flexShrink: 0, background: '#fff',
            borderRadius: 20, padding: 24,
            border: '1px solid #D0F5F0',
            boxShadow: '0 4px 20px rgba(0,201,177,0.06)',
            height: 'fit-content', position: 'sticky', top: 140,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 800, color: '#0D2B35', fontSize: 16 }}>Filters</h2>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} style={{
                fontSize: 12, color: '#00A896', fontWeight: 700,
                background: '#E8FBF8', border: 'none', borderRadius: 20,
                padding: '3px 10px', cursor: 'pointer',
              }}>Clear {activeFiltersCount}</button>
            )}
          </div>

          
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#A0BCBB', letterSpacing: 1, marginBottom: 10 }}>LISTING TYPE</p>
            {listingTypes.map(t => (
              <button key={t} onClick={() => setActiveType(t)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 12px', borderRadius: 10, border: 'none', marginBottom: 3,
                background: activeType === t ? 'linear-gradient(135deg, #00C9B1, #00A896)' : 'transparent',
                color: activeType === t ? '#fff' : '#4A6572',
                fontWeight: activeType === t ? 700 : 500,
                fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {t === 'All Types' ? '🏷 All Types'
                  : t === 'sell' ? '💰 Sell'
                  : t === 'rent' ? '🔑 Rent'
                  : t === 'borrow' ? '🤝 Borrow'
                  : '🔄 Swap'}
              </button>
            ))}
          </div>

          
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#A0BCBB', letterSpacing: 1, marginBottom: 10 }}>PRICE RANGE (₹)</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Min', minPrice, setMinPrice], ['Max', maxPrice, setMaxPrice]].map(([ph, val, set]) => (
                <input key={ph} type="number" placeholder={ph} value={val}
                  onChange={e => set(e.target.value)}
                  style={{
                    flex: 1, padding: '9px 10px', borderRadius: 8,
                    border: '1.5px solid #D0ECE8', outline: 'none',
                    fontSize: 13, color: '#0D2B35', background: '#F8FFFE', width: 0,
                  }}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'}
                />
              ))}
            </div>
          </div>

          
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#A0BCBB', letterSpacing: 1, marginBottom: 10 }}>MIN CONDITION</p>
            <div style={{ display: 'flex', gap: 5 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setMinCondition(minCondition === n ? null : n)} style={{
                  flex: 1, aspectRatio: '1', borderRadius: 8, border: '1.5px solid',
                  borderColor: minCondition >= n ? '#00C9B1' : '#D0ECE8',
                  background: minCondition >= n ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#fff',
                  color: minCondition >= n ? '#fff' : '#7A9BA8',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{n}</button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#A0BCBB', marginTop: 6, textAlign: 'center' }}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Like New'][minCondition] || '1=Poor · 5=Like New'}
            </p>
          </div>

          <button onClick={clearFilters} style={{
            width: '100%', padding: '10px', borderRadius: 10,
            border: '1.5px solid #D0ECE8', background: '#fff',
            color: '#7A9BA8', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>Reset All Filters</button>
        </motion.aside>

        
        <div style={{ flex: 1, minWidth: 0 }}>

          
          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {activeCategory !== 'All' && (
                <span style={{ background: '#E8FBF8', color: '#00A896', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #B2EFE8' }}>
                  {activeCategory} ✕
                </span>
              )}
              {activeType !== 'All Types' && (
                <span style={{ background: '#E8FBF8', color: '#00A896', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #B2EFE8' }}>
                  {activeType} ✕
                </span>
              )}
              {minCondition && (
                <span style={{ background: '#E8FBF8', color: '#00A896', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid #B2EFE8' }}>
                  Condition ≥ {minCondition} ✕
                </span>
              )}
            </div>
          )}

          
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(220px, 1fr))' : '1fr', gap: 18 }}>
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          
          {!loading && listings.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                textAlign: 'center', padding: '80px 40px',
                background: '#fff', borderRadius: 24,
                border: '1px dashed #B2EFE8',
              }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
              <h3 style={{ color: '#0D2B35', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Nothing found</h3>
              <p style={{ color: '#7A9BA8', marginBottom: 28, fontSize: 15 }}>
                Try different filters or be the first to post in this category!
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={clearFilters} style={{
                  padding: '11px 24px', borderRadius: 10, border: '1.5px solid #00C9B1',
                  color: '#00A896', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
                }}>Clear Filters</button>
                <Link to="/post" style={{
                  padding: '11px 24px', borderRadius: 10, textDecoration: 'none',
                  background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  boxShadow: '0 4px 15px rgba(0,201,177,0.3)',
                }}>+ Post a Listing</Link>
              </div>
            </motion.div>
          )}

          
          {!loading && listings.length > 0 && (
            <>
              <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                  <motion.div key="grid"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
                    {listings.map((item, i) => (
                      <ListingCard key={item.id} item={item} index={i} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="list"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {listings.map((item, i) => {
                      const tc = typeConfig[item.listing_type] || typeConfig.sell
                      return (
                        <motion.div key={item.id}
                          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          whileHover={{ x: 4 }}
                        >
                          <Link to={`/listings/${item.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                              background: '#fff', borderRadius: 16, padding: '16px 20px',
                              border: '1px solid #E0F5F0', display: 'flex',
                              alignItems: 'center', gap: 16,
                              boxShadow: '0 2px 10px rgba(0,201,177,0.05)',
                              transition: 'all 0.2s',
                            }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,201,177,0.15)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,201,177,0.05)'}
                            >
                              <div style={{
                                width: 72, height: 72, borderRadius: 12, flexShrink: 0,
                                background: '#F8FFFE', overflow: 'hidden',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid #E0F5F0',
                              }}>
                                {item.image_url
                                  ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                                  : <span style={{ fontSize: 28 }}>{categories.find(c => c.name === item.category)?.icon || '📦'}</span>
                                }
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.color, fontWeight: 700 }}>
                                    {tc.label}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#A0BCBB' }}>{'⭐'.repeat(item.condition)}</span>
                                </div>
                                <h3 style={{ fontWeight: 700, color: '#0D2B35', fontSize: 15, marginBottom: 4 }}>{item.title}</h3>
                                <p style={{ color: '#7A9BA8', fontSize: 13 }}>{item.category} · {item.department_tag || 'IIIT Sonepat'}</p>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{
                                  fontSize: 20, fontWeight: 900,
                                  background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                  {item.price === 1 ? 'Negotiate' : `₹${item.price}`}
                                </div>
                                <div style={{ fontSize: 12, color: '#A0BCBB', marginTop: 2 }}>View Details →</div>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              
              <div style={{
                marginTop: 32, padding: '16px 24px',
                background: '#fff', borderRadius: 16,
                border: '1px solid #D0F5F0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 12,
              }}>
                <span style={{ color: '#7A9BA8', fontSize: 13 }}>
                  Showing <strong style={{ color: '#0D2B35' }}>{listings.length}</strong> listings
                </span>
                <Link to="/post" style={{
                  padding: '9px 20px', borderRadius: 10, textDecoration: 'none',
                  background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  boxShadow: '0 4px 12px rgba(0,201,177,0.3)',
                }}>+ Add Your Listing</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
