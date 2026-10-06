import { io } from 'socket.io-client'
import { API_URL } from './axios'

// One live connection for the whole app, open while a user is logged in (see App.jsx).
// The token is read on every (re)connect, the same way the axios client reads it.
const socket = io(API_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
})

// Events sent while the connection was down are not replayed, so pages reload their data
// when it comes back. Returns a function that stops listening.
export function onReconnect(handler) {
  socket.io.on('reconnect', handler)
  return () => socket.io.off('reconnect', handler)
}

export default socket
