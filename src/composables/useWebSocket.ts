import { ref, onUnmounted } from 'vue'
import { Client as StompClient, type IFrame, type IMessage } from '@stomp/stompjs'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import type { Notification } from '@/types/notification'
import { toast } from 'vue3-toastify'

const stompClient = ref<StompClient | null>(null)
export const wsConnected = ref(false)

function subscribeNotifications(client: StompClient) {
  const notifStore = useNotificationsStore()
  client.subscribe('/user/queue/notifications', (message: IMessage) => {
    try {
      const notification: Notification = JSON.parse(message.body)
      notifStore.push(notification)

      const sev = (notification.severity ?? 'INFO').toUpperCase()
      const isCritical = sev === 'CRITICAL' || sev === 'ERROR'
      const isWarning = sev === 'WARNING'

      const icons: Record<string, string> = {
        ERROR: '🔴', CRITICAL: '🚨', WARNING: '⚠️', INFO: 'ℹ️'
      }
      const icon = icons[sev] ?? 'ℹ️'
      const text = notification.body
        ? `${icon} ${notification.title} — ${notification.body}`
        : `${icon} ${notification.title}`

      if (isCritical) {
        toast.error(text, { autoClose: false, closeOnClick: false })
      } else if (isWarning) {
        toast.warning(text, { autoClose: 6000 })
      } else {
        toast.info(text, { autoClose: 4000 })
      }
    } catch (e) {
      console.warn('[WS] Failed to parse notification', e)
    }
  })
}

/** Connect using current Pinia access token (module-level; safe outside setup). */
export function connectWebSocket() {
  if (stompClient.value?.connected) return
  const authStore = useAuthStore()
  const token = authStore.accessToken
  if (!token) return

  const baseUrl = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080').replace(/\/ws$/, '')
  const wsUrl = `${baseUrl}/ws`

  const client = new StompClient({
    brokerURL: wsUrl,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: (_frame: IFrame) => {
      wsConnected.value = true
      subscribeNotifications(client)
    },
    onDisconnect: () => {
      wsConnected.value = false
      console.log('[WS] Disconnected')
    },
    onStompError: (frame: IFrame) => {
      console.warn('[WS] STOMP error', frame.headers['message'])
    },
    onWebSocketError: (event: Event) => {
      console.warn('[WS] WebSocket error — real-time updates unavailable', event)
    }
  })

  client.activate()
  stompClient.value = client
}

export function disconnectWebSocket() {
  if (stompClient.value) {
    stompClient.value.deactivate()
    stompClient.value = null
    wsConnected.value = false
  }
}

/** After access token refresh, reconnect so the URL carries the new JWT. */
export function reconnectWebSocket() {
  disconnectWebSocket()
  connectWebSocket()
}

export function useWebSocket() {
  function connect() {
    connectWebSocket()
  }

  function disconnect() {
    disconnectWebSocket()
  }

  onUnmounted(disconnect)

  return { connect, disconnect, isConnected: wsConnected }
}
