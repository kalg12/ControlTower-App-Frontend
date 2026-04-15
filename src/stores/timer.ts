import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TimeEntry, TimeEntityType } from '@/types/time-tracking'
import { formatElapsed } from '@/types/time-tracking'

/**
 * Pinia store for the active (running) timer.
 * Maintains a client-side tick counter that is reconciled with the server's
 * startedAt timestamp on sync. Persisted to localStorage so the timer survives
 * page refreshes without losing elapsed seconds.
 */
export const useTimerStore = defineStore('timer', () => {
  const activeEntry  = ref<TimeEntry | null>(readPersistedEntry())
  const elapsedSeconds = ref<number>(computeElapsed(activeEntry.value))
  const isRunning    = ref<boolean>(activeEntry.value?.active ?? false)

  let tickInterval: ReturnType<typeof setInterval> | null = null

  // ── Computed ─────────────────────────────────────────────────────

  const formattedElapsed = computed(() => formatElapsed(elapsedSeconds.value))

  const isActiveFor = (entityType: TimeEntityType, entityId: string) =>
    isRunning.value &&
    activeEntry.value?.entityType === entityType &&
    activeEntry.value?.entityId === entityId

  // ── Actions ──────────────────────────────────────────────────────

  function syncFromServer(entry: TimeEntry | null) {
    activeEntry.value = entry
    if (entry && entry.active) {
      elapsedSeconds.value = computeElapsed(entry)
      isRunning.value = true
      startTick()
    } else {
      isRunning.value = false
      elapsedSeconds.value = 0
      stopTick()
    }
    persistEntry(entry)
  }

  function startTick() {
    if (tickInterval) return // already ticking
    tickInterval = setInterval(() => {
      if (isRunning.value) elapsedSeconds.value++
    }, 1000)
  }

  function stopTick() {
    if (tickInterval) {
      clearInterval(tickInterval)
      tickInterval = null
    }
  }

  function clear() {
    syncFromServer(null)
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  // Auto-start ticking if we restored a running timer from localStorage
  if (isRunning.value) startTick()

  return {
    activeEntry,
    elapsedSeconds,
    isRunning,
    formattedElapsed,
    isActiveFor,
    syncFromServer,
    clear,
  }
})

// ── Helpers ───────────────────────────────────────────────────────────

function computeElapsed(entry: TimeEntry | null): number {
  if (!entry || !entry.active) return 0
  const started = new Date(entry.startedAt).getTime()
  return Math.max(0, Math.floor((Date.now() - started) / 1000))
}

function persistEntry(entry: TimeEntry | null) {
  try {
    if (entry) {
      localStorage.setItem('ct_active_timer', JSON.stringify(entry))
    } else {
      localStorage.removeItem('ct_active_timer')
    }
  } catch {
    // ignore storage errors
  }
}

function readPersistedEntry(): TimeEntry | null {
  try {
    const raw = localStorage.getItem('ct_active_timer')
    if (!raw) return null
    const entry = JSON.parse(raw) as TimeEntry
    // Discard if entry was stopped (has endedAt)
    return entry.active ? entry : null
  } catch {
    return null
  }
}
