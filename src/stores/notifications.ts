import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationsService } from '@/services/notifications.service'
import type { Notification } from '@/types/notification'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])
  const loading = ref(false)
  const totalElements = ref(0)

  const unreadCount = computed(() => items.value.filter(n => !n.read).length)

  async function fetch(page = 0) {
    loading.value = true
    try {
      const res = await notificationsService.list({ page, size: 20 })
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

  // Auto-fetch on store creation if token exists
  if (localStorage.getItem('accessToken')) {
    fetch()
  }

  return {
    items,
    loading,
    totalElements,
    unreadCount,
    fetch,
    markRead,
    markAllRead,
    remove
  }
})
