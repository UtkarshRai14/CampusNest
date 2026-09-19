import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Listings from './pages/Listings'
import PostListing from './pages/PostListing'
import ListingDetail from './pages/ListingDetail'
import Messages from './pages/Messages'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import ARIAChat from './components/ARIAChat'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#fff', color: '#0D2B35',
          border: '1px solid #D0F5F0',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,201,177,0.15)',
        },
        success: { iconTheme: { primary: '#00C9B1', secondary: '#fff' } },
      }} />
      <Navbar />
      <ARIAChat />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route path="/post" element={<PostListing />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
