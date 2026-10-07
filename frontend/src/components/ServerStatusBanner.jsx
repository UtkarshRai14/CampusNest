import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL, SLOW_REQUEST_EVENT } from '../api/axios'

// The backend runs on a free hosting plan that puts it to sleep after about 15 minutes
// without visitors. The first request after that is held until the server has started,
// which takes about a minute. This notice explains the wait so the site does not look broken.

const SHOW_AFTER_MS = 4000          // an awake server answers /health well within this
const RETRY_MS = 4000
const SLOW_RETRY_MS = 15000
const HEALTH_TIMEOUT_MS = 90000
const STILL_WAITING_AFTER_MS = 100000
const READY_VISIBLE_MS = 6000
const RECHECK_AFTER_HIDDEN_MS = 10 * 60 * 1000

const MESSAGES = {
  waking: {
    icon: '⏳',
    title: 'Waking up the server…',
    text: 'CampusNest runs on free hosting, so the server sleeps when nobody is using it. Starting it again takes about a minute. Keep this page open and everything will load on its own.',
  },
  slow: {
    icon: '🐢',
    title: 'Still starting up…',
    text: 'This is taking longer than usual. If nothing has loaded in another minute, please refresh the page.',
  },
  offline: {
    icon: '📡',
    title: 'You are offline',
    text: 'Check your internet connection. CampusNest will reconnect automatically.',
  },
  ready: {
    icon: '✅',
    title: 'Server is ready',
    text: 'Thanks for waiting! CampusNest is ready to use.',
  },
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function isServerUp() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store', signal: controller.signal })
    return res.ok
  } catch {
    // Network error or timeout: the server is still starting, or the visitor is offline.
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export default function ServerStatusBanner() {
  // 'ok' | 'waking' | 'slow' | 'offline' | 'ready'
  const [status, setStatus] = useState('ok')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let checking = false
    let readyTimer = null
    let hiddenAt = null

    // Calls /health until the server answers. The notice only appears if that takes longer
    // than an awake server would, so visitors never see it while the server is running.
    const checkServer = async () => {
      if (checking) return
      checking = true
      clearTimeout(readyTimer)
      const startedAt = Date.now()
      const elapsed = () => Date.now() - startedAt
      let shown = false
      let wasWaking = false
      const show = (next) => {
        if (cancelled) return
        if (!shown) setDismissed(false)
        shown = true
        if (next !== 'offline') wasWaking = true
        setStatus(next)
      }
      const waitingStatus = () => {
        if (navigator.onLine === false) return 'offline'
        return elapsed() > STILL_WAITING_AFTER_MS ? 'slow' : 'waking'
      }
      // A sleeping server holds the request instead of failing it, so the notice is driven by
      // how long the request has been pending, and moves to "still starting" if that drags on.
      const attempt = async () => {
        const timers = [setTimeout(() => show(waitingStatus()), SHOW_AFTER_MS)]
        const untilStillWaiting = STILL_WAITING_AFTER_MS - elapsed()
        if (untilStillWaiting > 0) timers.push(setTimeout(() => show(waitingStatus()), untilStillWaiting + 1000))
        try {
          return await isServerUp()
        } finally {
          timers.forEach(clearTimeout)
        }
      }

      while (!cancelled && !(await attempt())) {
        // A quick failure: the visitor is offline, or the server is restarting.
        if (elapsed() >= SHOW_AFTER_MS || navigator.onLine === false) show(waitingStatus())
        await sleep(elapsed() > STILL_WAITING_AFTER_MS ? SLOW_RETRY_MS : RETRY_MS)
      }

      checking = false
      if (cancelled) return
      if (wasWaking) {
        setStatus('ready')
        readyTimer = setTimeout(() => setStatus('ok'), READY_VISIBLE_MS)
      } else {
        setStatus('ok')
      }
    }

    // The server falls asleep again after a quiet period, so check again when a request is
    // slow, when the visitor returns to a tab left in the background, or when they reconnect.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (hiddenAt && Date.now() - hiddenAt > RECHECK_AFTER_HIDDEN_MS) {
        hiddenAt = null
        checkServer()
      }
    }

    checkServer()
    window.addEventListener(SLOW_REQUEST_EVENT, checkServer)
    window.addEventListener('online', checkServer)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelled = true
      clearTimeout(readyTimer)
      window.removeEventListener(SLOW_REQUEST_EVENT, checkServer)
      window.removeEventListener('online', checkServer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const message = MESSAGES[status]
  const visible = Boolean(message) && !dismissed

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="server-status"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed', top: 80, left: 12, right: 12, zIndex: 998,
            maxWidth: 560, margin: '0 auto',
            background: status === 'ready' ? '#F0FFF8' : '#FFFDF5',
            border: `1px solid ${status === 'ready' ? '#B2EFD8' : '#F5E3B0'}`,
            borderRadius: 14, padding: '14px 44px 14px 16px',
            boxShadow: '0 8px 30px rgba(13,43,53,0.12)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1.2 }} aria-hidden="true">{message.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0D2B35', marginBottom: 3 }}>{message.title}</div>
            <div style={{ fontSize: 13, color: '#4A6572', lineHeight: 1.5 }}>{message.text}</div>
            {status === 'waking' && (
              <div style={{ marginTop: 10, height: 4, borderRadius: 4, background: '#F5E9C8', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '95%' }}
                  transition={{ duration: 60, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #00C9B1, #00A896)' }}
                />
              </div>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            style={{
              position: 'absolute', top: 8, right: 8, width: 28, height: 28,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: '#7A9BA8', fontSize: 18, lineHeight: 1, borderRadius: 8,
            }}
          >×</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
