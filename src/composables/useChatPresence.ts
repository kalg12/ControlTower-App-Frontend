import { ref } from 'vue'
import { chatService } from '@/services/chat.service'

const isOnline = ref(false)
let started = false
let heartbeat: ReturnType<typeof setInterval> | null = null

export function useChatPresence() {
  async function start() {
    if (started) return
    started = true

    try {
      await chatService.setPresence(true)
      isOnline.value = true
      localStorage.setItem('ct_agent_online', 'true')
    } catch {
      started = false
      isOnline.value = false
      return
    }

    heartbeat = setInterval(() => {
      if (isOnline.value) chatService.setPresence(true).catch(() => {})
    }, 25_000)
  }

  async function setOnline(online: boolean) {
    await chatService.setPresence(online)
    isOnline.value = online
    localStorage.setItem('ct_agent_online', String(online))
  }

  function toggle() {
    return setOnline(!isOnline.value)
  }

  function stop() {
    if (heartbeat) clearInterval(heartbeat)
    heartbeat = null
    started = false
    if (isOnline.value) chatService.setPresence(false).catch(() => {})
    isOnline.value = false
  }

  return { isOnline, start, stop, setOnline, toggle }
}
