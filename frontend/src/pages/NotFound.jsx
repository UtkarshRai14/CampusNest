import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', background: '#F5FFFE', padding: 24, textAlign: 'center' }}>
      <div>
        <p style={{ color: '#00A896', fontWeight: 800, letterSpacing: 2 }}>404</p>
        <h1 style={{ color: '#0D2B35', fontSize: 30, margin: '8px 0' }}>Page not found</h1>
        <p style={{ color: '#7A9BA8', marginBottom: 22 }}>That CampusNest page does not exist.</p>
        <Link to="/" style={{ display: 'inline-block', padding: '11px 22px', borderRadius: 10, background: 'linear-gradient(135deg, #00C9B1, #00A896)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>Go to home</Link>
      </div>
    </main>
  )
}
