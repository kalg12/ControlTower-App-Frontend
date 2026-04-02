import { ref, onUnmounted } from 'vue'
import { Client as StompClient, type IFrame, type IMessage } from '@stomp/stompjs'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import type { Notification } from '@/types/notification'
import { toast } from 'vue-sonner'

const stompClient = ref<StompClient | null>(null)

export function useWebSocket() {
  const authStore = useAuthStore()
  const notifStore = useNotificationsStore()

  function connect() {
    if (stompClient.value?.connected) return
    const token = authStore.accessToken
    if (!token) return

    const wsUrl = `${import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080'}/ws`

    const client = new StompClient({
      brokerURL: `${wsUrl}?token=${token}`,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: (_frame: IFrame) => {
        client.subscribe('/user/queue/notifications', (message: IMessage) => {
          try {
            const notification: Notification = JSON.parse(message.body)
            // Prepend to store items
            notifStore.items.unshift(notification)
            // Show sonner toast
            const icons: Record<string, string> = {
              ERROR: '🔴', CRITICAL: '🔴', WARNING: '⚠️', WARN: '⚠️', SUCCESS: '✅', INFO: 'ℹ️'
            }
            const s = (notification.severity || notification.type || 'INFO').toUpperCase()
            const icon = icons[s] ?? 'ℹ️'
            toast(`${icon} ${notification.title}`, {
              description: notification.body,
              duration: 5000
            })
          } catch (e) {
            console.warn('[WS] Failed to parse notification', e)
          }
        })
      },
      onDisconnect: () => {
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

  function disconnect() {
    if (stompClient.value?.connected) {
      stompClient.value.deactivate()
      stompClient.value = null
    }
  }

  onUnmounted(disconnect)

  return { connect, disconnect, isConnected: stompClient.value?.connected ?? false }
}
