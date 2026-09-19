import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import API from '../api/axios'
import useAuthStore from '../store/authStore'

const categories = ['Books','Laptop','Calculator','Drawing Instruments','Stationery','Fan','Cooler','Hostel Items','Electronics','Other']
const listingTypes = ['sell','rent','borrow','swap']

export default function PostListing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [priceData, setPriceData] = useState(null)
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', category: '', listing_type: 'sell',
    price: '', condition: 3, months_used: 0,
  })

  useEffect(() => { if (!isAuthenticated) { toast.error('Please login first'); navigate('/login') } }, [])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (file) { setImage(file); setImagePreview(URL.createObjectURL(file)) }
  }

  const predictPrice = async () => {
    if (!form.category || !form.condition) { toast.error('Select category and condition first'); return }
    setPredicting(true)
    try {
      const res = await API.post('/predict/price', {
        category: form.category, condition: parseInt(form.condition),
        months_used: parseInt(form.months_used) || 0, listing_type: form.listing_type,
      })
      setPriceData(res.data)
      toast.success('AI price prediction ready! 🤖')
    } catch { toast.error('Prediction failed') }
    finally { setPredicting(false) }
  }

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.price) { toast.error('Fill all required fields'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (image) fd.append('image', image)
      await API.post('/listings/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Listing posted! 🎉')
      navigate('/listings')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to post') }
    finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1.5px solid #D0ECE8', outline: 'none', fontSize: 15,
    color: '#0D2B35', background: '#F8FFFE', boxSizing: 'border-box', transition: 'border 0.2s',
  }
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#4A6572', display: 'block', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #FFFFFF 0%, #E8FDFB 60%, #D0F8F3 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#0D2B35', marginBottom: 8 }}>Post a Listing</h1>
          <p style={{ color: '#7A9BA8' }}>List your item for the IIIT Sonepat campus community</p>
        </motion.div>

        
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 5, borderRadius: 4,
              background: step >= s ? 'linear-gradient(90deg, #00C9B1, #00A896)' : '#E0F0EC',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <motion.div
          key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          style={{
            background: '#fff', borderRadius: 24, padding: '40px',
            boxShadow: '0 8px 40px rgba(0,201,177,0.1)', border: '1px solid #D0F5F0',
          }}
        >

          
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ color: '#A0BCBB', fontSize: 13, fontWeight: 600 }}>STEP 1 OF 3 — Basic Details</p>

              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} placeholder="e.g. RD Sharma Maths Book Sem 3"
                  value={form.title} onChange={e => update('title', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                  placeholder="Describe the item — condition, edition, reason for selling..."
                  value={form.description} onChange={e => update('description', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
              </div>

              <div>
                <label style={labelStyle}>Category *</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }}
                  value={form.category} onChange={e => update('category', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Listing Type *</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {listingTypes.map(t => (
                    <button key={t} onClick={() => update('listing_type', t)} style={{
                      padding: '10px 22px', borderRadius: 10, border: '1.5px solid',
                      borderColor: form.listing_type === t ? '#00C9B1' : '#D0ECE8',
                      background: form.listing_type === t ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#fff',
                      color: form.listing_type === t ? '#fff' : '#4A6572',
                      fontWeight: 600, fontSize: 14, cursor: 'pointer', textTransform: 'capitalize',
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <button onClick={() => { if (!form.title || !form.category) { toast.error('Fill title and category'); return } setStep(2) }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                  color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,201,177,0.35)', marginTop: 4,
                }}>Next →</button>
            </div>
          )}

          
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ color: '#A0BCBB', fontSize: 13, fontWeight: 600 }}>STEP 2 OF 3 — Pricing & Condition</p>

              <div>
                <label style={labelStyle}>Condition (1=Poor · 5=Like New) *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => update('condition', n)} style={{
                      flex: 1, padding: '12px 0', borderRadius: 10, border: '1.5px solid',
                      borderColor: form.condition === n ? '#00C9B1' : '#D0ECE8',
                      background: form.condition === n ? 'linear-gradient(135deg, #00C9B1, #00A896)' : '#fff',
                      color: form.condition === n ? '#fff' : '#4A6572',
                      fontWeight: 700, fontSize: 16, cursor: 'pointer',
                    }}>{n}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Months Used</label>
                <input type="number" style={inputStyle} placeholder="e.g. 6"
                  value={form.months_used} onChange={e => update('months_used', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
              </div>

              
              <div style={{
                background: 'linear-gradient(135deg, #E8FDFB, #D0F8F3)',
                borderRadius: 14, padding: 20, border: '1px solid #B2EFE8',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#0D2B35', marginBottom: 2 }}>🤖 AI Price Prediction</p>
                    <p style={{ fontSize: 13, color: '#6A8A96' }}>Let our ML model suggest a fair price</p>
                  </div>
                  <button onClick={predictPrice} disabled={predicting} style={{
                    padding: '9px 20px', borderRadius: 8, border: 'none',
                    background: predicting ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)',
                    color: '#fff', fontWeight: 700, fontSize: 13, cursor: predicting ? 'not-allowed' : 'pointer',
                  }}>{predicting ? '...' : 'Predict'}</button>
                </div>
                {priceData && (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[['Min', priceData.min_price], ['Suggested', priceData.suggested_price], ['Max', priceData.max_price]].map(([label, val]) => (
                      <div key={label} onClick={() => label === 'Suggested' && update('price', Math.round(val))}
                        style={{
                          flex: 1, textAlign: 'center', background: label === 'Suggested' ? '#00C9B1' : '#fff',
                          borderRadius: 10, padding: '10px 0', cursor: label === 'Suggested' ? 'pointer' : 'default',
                          border: '1px solid #B2EFE8',
                        }}>
                        <div style={{ fontSize: 11, color: label === 'Suggested' ? 'rgba(255,255,255,0.8)' : '#7A9BA8', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontWeight: 800, color: label === 'Suggested' ? '#fff' : '#0D2B35' }}>₹{Math.round(val)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Your Price (₹) *</label>
                <input type="number" style={inputStyle} placeholder="Enter price"
                  value={form.price} onChange={e => update('price', e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#00C9B1'}
                  onBlur={e => e.target.style.borderColor = '#D0ECE8'} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: '13px', borderRadius: 10,
                  border: '1.5px solid #D0ECE8', background: '#fff',
                  color: '#4A6572', fontWeight: 600, cursor: 'pointer',
                }}>← Back</button>
                <button onClick={() => { if (!form.price) { toast.error('Enter a price'); return } setStep(3) }} style={{
                  flex: 2, padding: '13px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #00C9B1, #00A896)',
                  color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(0,201,177,0.3)',
                }}>Next →</button>
              </div>
            </div>
          )}

          
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ color: '#A0BCBB', fontSize: 13, fontWeight: 600 }}>STEP 3 OF 3 — Add Photo & Review</p>

              
              <div>
                <label style={labelStyle}>Item Photo</label>
                <label style={{
                  display: 'block', border: '2px dashed #B2EFE8', borderRadius: 14,
                  padding: '32px', textAlign: 'center', cursor: 'pointer',
                  background: '#F8FFFE', transition: 'all 0.2s',
                }}>
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" style={{ maxHeight: 200, borderRadius: 10, objectFit: 'contain' }} />
                    : <>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📸</div>
                        <p style={{ color: '#00A896', fontWeight: 600 }}>Click to upload photo</p>
                        <p style={{ color: '#A0BCBB', fontSize: 13 }}>JPG, PNG up to 5MB</p>
                      </>
                  }
                  <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                </label>
              </div>

              
              <div style={{ background: '#F8FFFE', borderRadius: 14, padding: 20, border: '1px solid #D0ECE8' }}>
                <p style={{ fontWeight: 700, color: '#0D2B35', marginBottom: 14 }}>📋 Listing Summary</p>
                {[
                  ['Title', form.title], ['Category', form.category],
                  ['Type', form.listing_type], ['Price', `₹${form.price}`],
                  ['Condition', `${form.condition}/5`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#7A9BA8', fontSize: 14 }}>{k}</span>
                    <span style={{ color: '#0D2B35', fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button onClick={() => setStep(2)} style={{
                  flex: 1, padding: '13px', borderRadius: 10,
                  border: '1.5px solid #D0ECE8', background: '#fff',
                  color: '#4A6572', fontWeight: 600, cursor: 'pointer',
                }}>← Back</button>
                <button onClick={handleSubmit} disabled={loading} style={{
                  flex: 2, padding: '13px', borderRadius: 10, border: 'none',
                  background: loading ? '#B2EFE8' : 'linear-gradient(135deg, #00C9B1, #00A896)',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(0,201,177,0.3)',
                }}>{loading ? 'Posting...' : '🚀 Post Listing'}</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
