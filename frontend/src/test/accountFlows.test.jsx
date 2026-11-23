import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'

const { api, toast, authStore, updateUser } = vi.hoisted(() => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  updateUser: vi.fn(),
  authStore: vi.fn(),
}))

vi.mock('../api/axios', () => ({ default: api }))
vi.mock('../api/socket', () => ({ default: {}, onReconnect: vi.fn(() => vi.fn()) }))
vi.mock('react-hot-toast', () => ({ default: toast }))
vi.mock('../store/authStore', () => ({ default: authStore }))

import PasswordReset from '../pages/PasswordReset'
import Profile from '../pages/Profile'
import ListingDetail from '../pages/ListingDetail'

describe('account security UI', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.put.mockReset()
    api.post.mockReset()
    authStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 7, name: 'Student', email: 'student@iiitsonepat.ac.in', whatsapp: null, share_email: false, share_whatsapp: false },
      updateUser,
      logout: vi.fn(),
    })
  })

  it('sends a generic forgot-password request for the entered email', async () => {
    api.post.mockResolvedValue({ data: { message: 'If an account exists for that email, password reset instructions will be sent.' } })
    render(<MemoryRouter initialEntries={['/forgot-password']}><PasswordReset /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('College email'), { target: { value: 'Student@IIITSONEPAT.AC.IN' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/users/forgot-password', { email: 'student@iiitsonepat.ac.in' }))
    expect(toast.success).toHaveBeenCalled()
  })

  it('submits a valid reset token and returns the user to login', async () => {
    api.post.mockResolvedValue({ data: { message: 'Password reset successfully. Please log in again.' } })
    render(
      <MemoryRouter initialEntries={['/reset-password?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']}>
        <Routes>
          <Route path="/reset-password" element={<PasswordReset />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'valid-password-123' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'valid-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/users/reset-password', {
      token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      password: 'valid-password-123',
    }))
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('persists seller contact consent from profile controls', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/listings/my-listings') return Promise.resolve({ data: [] })
      if (url === '/analytics/recommendations/7') return Promise.resolve({ data: { recommendations: [] } })
      return Promise.reject(new Error('unexpected request'))
    })
    api.put.mockResolvedValue({ data: { user: { id: 7, share_email: true, share_whatsapp: false, whatsapp: null } } })
    render(<MemoryRouter><Profile /></MemoryRouter>)
    const emailConsent = await screen.findByLabelText('Share my email on my listings and in first replies')
    fireEvent.click(emailConsent)
    fireEvent.click(screen.getByRole('button', { name: /Save/ }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/me', {
      whatsapp: '', share_email: true, share_whatsapp: false,
    }))
    expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ share_email: true }))
  })

  it('discards an older listing request when the route id changes', async () => {
    api.get.mockImplementation((url, config) => {
      if (url === '/listings/1') {
        return new Promise((resolve, reject) => {
          config.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        })
      }
      return Promise.resolve({ data: {
        id: 2, title: 'Second listing', description: 'Available now', price: 100,
        condition: 3, category: 'Books', listing_type: 'sell', department_tag: 'CSE',
        semester_tag: 1, image_url: null, is_active: true, availability_status: 'available',
        seller_id: 9, seller_name: 'Seller', seller_school: 'IIIT Sonepat',
        seller_department: 'CSE', seller_semester: 3, seller_email: '', seller_whatsapp: null,
      } })
    })

    render(
      <MemoryRouter initialEntries={['/listings/1']}>
        <Link to="/listings/2">Open next listing</Link>
        <Routes><Route path="/listings/:id" element={<ListingDetail />} /></Routes>
      </MemoryRouter>
    )
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/listings/1', expect.objectContaining({ signal: expect.any(AbortSignal) })))
    fireEvent.click(screen.getByRole('link', { name: 'Open next listing' }))
    expect(await screen.findByRole('heading', { name: 'Second listing' })).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('sorts and merges messages by stable timestamps without duplicates', async () => {
    const { mergeMessages } = await import('../pages/Messages')
    const earlier = { id: 10, content: 'buyer message', created_at: '2026-01-01T10:00:00.000Z' }
    const later = { id: 11, content: 'automatic reply', created_at: '2026-01-01T10:00:01.000Z' }
    expect(mergeMessages([later], [earlier, later])).toEqual([earlier, later])
  })
})
