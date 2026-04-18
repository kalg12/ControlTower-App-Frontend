import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationsService } from '@/services/notifications.service'
import type { Notification, NotificationCategory } from '@/types/notification'
import { getCategory } from '@/types/notification'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])
  const loading = ref(false)
  const totalElements = ref(0)

  const unreadCount = computed(() => items.value.filter(n => !n.read).length)

  const unreadByCategory = computed(() => {
    const counts: Record<NotificationCategory, number> = {
      ALL: 0, TICKETS: 0, KANBAN: 0, FINANCE: 0, SYSTEM: 0
    }
    items.value.filter(n => !n.read).forEach(n => {
      const cat = getCategory(n.type)
      counts[cat]++
      counts.ALL++
    })
    return counts
  })

  const ticketsBadge = computed(() =>
    items.value.filter(n => !n.read && (
      n.type === 'TICKET_ASSIGNED' || n.type === 'TICKET_ESCALATED' || n.type === 'TICKET_SLA_BREACHED'
    )).length
  )

  const kanbanBadge = computed(() =>
    items.value.filter(n => !n.read && (
      n.type === 'CARD_DUE_SOON' || n.type === 'CARD_OVERDUE'
    )).length
  )

  const financeBadge = computed(() =>
    items.value.filter(n => !n.read && (
      n.type === 'INVOICE_DUE_SOON' || n.type === 'INVOICE_OVERDUE'
    )).length
  )

  const posBadgeCount = computed(() =>
    items.value.filter(n => !n.read && (n.type === 'POS_TICKET' || n.type === 'POS_CHAT')).length
  )

  async function fetch(page = 0) {
    loading.value = true
    try {
      const res = await notificationsService.list({ page, size: 50 })
      items.value = res.content
      totalElements.value = res.totalElements
    } catch (e) {
      console.error('Failed to fetch notifications', e)
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string) {
    await notificationsService.markRead(id)
    const item = items.value.find(n => n.id === id)
    if (item) item.read = true
  }

  async function markAllRead() {
    await notificationsService.markAllRead()
    items.value.forEach(n => (n.read = true))
  }

  async function remove(id: string) {
    await notificationsService.remove(id)
    items.value = items.value.filter(n => n.id !== id)
  }

  async function removeAll() {
    await notificationsService.removeAll()
    items.value = []
    totalElements.value = 0
  }

  function push(notif: Notification) {
    items.value.unshift(notif)
    totalElements.value++
  }

  if (localStorage.getItem('accessToken')) {
    fetch()
  }

  return {
    items,
    loading,
    totalElements,
    unreadCount,
    unreadByCategory,
    ticketsBadge,
    kanbanBadge,
    financeBadge,
    posBadgeCount,
    fetch,
    markRead,
    markAllRead,
    remove,
    removeAll,
    push
  }
})
