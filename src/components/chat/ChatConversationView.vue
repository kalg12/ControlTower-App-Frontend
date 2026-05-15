<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { Client as StompClient } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '@/stores/auth'
import { chatService } from '@/services/chat.service'
import { qk } from '@/queries/keys'
import type { ChatConversation, ChatMessage, ChatMessagePayload, ChatQuickReply } from '@/types/chat'

const { t } = useI18n()

const props = defineProps<{ conversation: ChatConversation }>()
const emit = defineEmits<{
  close: []
  transfer: []
  closed: []
  archived: []
  unarchived: []
  deleted: []
}>()

const auth = useAuthStore()
const messagesEl = ref<HTMLElement | null>(null)
const inputText = ref('')
const isTyping = ref(false)
const typingTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const showQuickReplies = ref(false)

function hideQuickRepliesDelayed() {
  window.setTimeout(() => { showQuickReplies.value = false }, 200)
}
const messages = ref<ChatMessage[]>([])
const remoteTyping = ref(false)
let remoteTypingTimer: ReturnType<typeof setTimeout> | null = null

const { data: convData } = useQuery({
  queryKey: qk.chatConversation(props.conversation.id),
  queryFn: () => chatService.getConversation(props.conversation.id),
  // Poll every 8 s as a STOMP fallback — merge ensures no duplicates
  refetchInterval: 8000,
})

watch(convData, (data) => {
  if (!data?.messages) return
  if (messages.value.length === 0) {
    // Initial load — set directly
    messages.value = data.messages
    nextTick(scrollBottom)
    return
  }
  // Subsequent refetches — merge to avoid overwriting STOMP-delivered messages
  const existingIds = new Set(messages.value.map(m => m.id))
  let added = false
  for (const msg of data.messages) {
    if (!existingIds.has(msg.id)) {
      messages.value.push(msg)
      added = true
    }
  }
  if (added) nextTick(scrollBottom)
}, { immediate: true })

const { data: quickReplies } = useQuery({
  queryKey: qk.chatQuickReplies(),
  queryFn: () => chatService.getQuickReplies(),
})

const stompClient = ref<StompClient | null>(null)
const stompConnected = ref(false)

onMounted(() => {
  if (!auth.accessToken) return
  const wsUrl =
    (import.meta.env.VITE_WS_URL as string | undefined) ||
    (() => {
      const base = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? '')
        .replace(/\/api\/v1$/, '').replace(/\/$/, '')
      return base ? `${base}/ws` : `${window.location.origin}/ws`
    })()

  let client: StompClient
  client = new StompClient({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: { Authorization: `Bearer ${auth.accessToken}` },
    beforeConnect: () => {
      if (auth.accessToken) client.connectHeaders = { Authorization: `Bearer ${auth.accessToken}` }
    },
    reconnectDelay: 5000,
    onConnect: () => {
      stompConnected.value = true
      // Subscribe first so broadcasts from flushed pending messages aren't missed
      client.subscribe(`/topic/chat.${props.conversation.id}`, (frame) => {
        const payload: ChatMessagePayload = JSON.parse(frame.body)
        if (payload.type === 'MESSAGE' || payload.type === 'SYSTEM') {
          const msgId = payload.id ?? crypto.randomUUID()
          // Skip if already in the list (could arrive from both STOMP and HTTP poll)
          if (payload.id && messages.value.some(m => m.id === payload.id)) return
          messages.value.push({
            id: msgId,
            conversationId: payload.conversationId,
            senderType: payload.senderType ?? 'SYSTEM',
            senderId: payload.senderId,
            senderName: payload.senderName,
            senderAvatarUrl: payload.senderAvatarUrl,
            content: payload.content ?? '',
            attachmentUrl: payload.attachmentUrl,
            isRead: payload.isRead ?? false,
            createdAt: payload.createdAt,
          })
          nextTick(scrollBottom)
        } else if (payload.type === 'TYPING') {
          const isVisitorTyping = payload.senderType === 'VISITOR'
          if (!isVisitorTyping) return
          remoteTyping.value = true
          if (remoteTypingTimer) clearTimeout(remoteTypingTimer)
          remoteTypingTimer = setTimeout(() => { remoteTyping.value = false }, 3000)
        } else if (payload.type === 'STATUS_CHANGED' && payload.conversationStatus === 'CLOSED') {
          emit('closed')
        }
      })
    },
    onDisconnect: () => { stompConnected.value = false },
    onStompError: () => { stompConnected.value = false },
    onWebSocketError: () => { stompConnected.value = false },
  })
  client.activate()
  stompClient.value = client
  chatService.markRead(props.conversation.id)
})

onUnmounted(() => {
  stompConnected.value = false
  stompClient.value?.deactivate()
  if (remoteTypingTimer) clearTimeout(remoteTypingTimer)
})

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  if (text.startsWith('/')) {
    const reply = quickReplies.value?.find((r: ChatQuickReply) => text === r.shortcut)
    if (reply) { inputText.value = reply.content; return }
  }
  inputText.value = ''
  showQuickReplies.value = false

  // Always send via REST: guarantees DB persistence + server-side STOMP broadcast.
  // If REST fails, fall back to STOMP publish as last resort.
  chatService.sendMessage(props.conversation.id, text)
    .then(msg => {
      if (!messages.value.some(m => m.id === msg.id)) {
        messages.value.push(msg)
        nextTick(scrollBottom)
      }
    })
    .catch(() => {
      if (stompConnected.value) {
        stompClient.value?.publish({
          destination: '/app/chat.agent.message',
          body: JSON.stringify({ content: text, conversationId: props.conversation.id }),
        })
      }
    })
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
    return
  }
  if (e.key === '/') {
    showQuickReplies.value = true
  }
  sendTypingSignal()
}

function sendTypingSignal() {
  if (typingTimeout.value) clearTimeout(typingTimeout.value)
  stompClient.value?.publish({
    destination: '/app/chat.typing',
    body: JSON.stringify({ conversationId: props.conversation.id }),
  })
  typingTimeout.value = setTimeout(() => { isTyping.value = false }, 2000)
}

const fileInputEl = ref<HTMLInputElement | null>(null)

function openFilePicker() {
  fileInputEl.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  try {
    const { default: api } = await import('@/services/api')
    await api.post(`/chat/conversations/${props.conversation.id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch (err) {
    console.error('[Chat] upload error', err)
  }
  if (fileInputEl.value) fileInputEl.value.value = ''
}

const closeMut = useMutation({
  mutationFn: () => chatService.close(props.conversation.id),
  onSuccess: () => emit('closed'),
})

const archiveMut = useMutation({
  mutationFn: () => chatService.archive(props.conversation.id),
  onSuccess: () => emit('archived'),
})

const unarchiveMut = useMutation({
  mutationFn: () => chatService.unarchive(props.conversation.id),
  onSuccess: () => emit('unarchived'),
})

const deleteMut = useMutation({
  mutationFn: () => chatService.delete(props.conversation.id),
  onSuccess: () => emit('deleted'),
})

const showDeleteConfirm = ref(false)

function scrollBottom() {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function avatarColor(name: string) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[Math.abs(h)]
}

function formatTime(ts: unknown): string {
  if (!ts) return ''
  // Handle rare case where Jackson serializes Instant as {epochSecond, nano}
  if (typeof ts === 'object' && ts !== null && 'epochSecond' in ts) {
    return new Date((ts as { epochSecond: number }).epochSecond * 1000)
      .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }
  const d = new Date(ts as string)
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function filteredQuickReplies() {
  const q = inputText.value.toLowerCase()
  return (quickReplies.value ?? []).filter((r: ChatQuickReply) => r.shortcut.includes(q) || r.content.toLowerCase().includes(q)).slice(0, 5)
}

function applyQuickReply(r: ChatQuickReply) {
  inputText.value = r.content
  showQuickReplies.value = false
}

function isGrouped(i: number) {
  return i > 0 && messages.value[i - 1].senderType === messages.value[i].senderType && messages.value[i].senderType !== 'SYSTEM'
}
</script>

<template>
  <div class="chat-conversation">
    <!-- Header -->
    <div class="chat-header">
      <div class="flex items-center gap-3 min-w-0">
        <button class="chat-header-back" @click="emit('close')">
          <i class="pi pi-arrow-left" />
        </button>
        <div class="chat-avatar-sm" :style="{ background: avatarColor(conversation.visitorName) }">
          {{ initials(conversation.visitorName) }}
        </div>
        <div class="min-w-0">
          <div class="chat-header-name">{{ conversation.visitorName }}</div>
          <div class="chat-header-status">{{ conversation.status === 'ACTIVE' ? t('chatModule.status.active') : conversation.status === 'WAITING' ? t('chatModule.status.waiting') : t(`chatModule.status.${conversation.status.toLowerCase()}`) }}</div>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button v-if="conversation.status === 'ACTIVE'" class="chat-header-btn" @click="emit('transfer')">{{ t('chatModule.actions.transfer') }}</button>
        <button v-if="conversation.status === 'ACTIVE'" class="chat-header-btn" @click="closeMut.mutate()">{{ t('chatModule.actions.close') }}</button>
        <button v-if="conversation.status === 'CLOSED'" class="chat-header-btn" :class="archiveMut.isPending.value ? 'opacity-50 cursor-wait' : ''" @click="archiveMut.mutate()">{{ t('chatModule.actions.archive') }}</button>
        <button v-if="conversation.status === 'ARCHIVED'" class="chat-header-btn" :class="unarchiveMut.isPending.value ? 'opacity-50 cursor-wait' : ''" @click="unarchiveMut.mutate()">{{ t('chatModule.actions.unarchive') }}</button>
        <template v-if="conversation.status === 'CLOSED' || conversation.status === 'ARCHIVED'">
          <template v-if="showDeleteConfirm">
            <button class="chat-header-btn-danger" :class="deleteMut.isPending.value ? 'opacity-50 cursor-wait' : ''" @click="deleteMut.mutate()">{{ t('chatModule.actions.confirmDelete') }}</button>
            <button class="chat-header-btn" @click="showDeleteConfirm = false">{{ t('common.cancel') }}</button>
          </template>
          <button v-else class="chat-header-btn-danger-outline" @click="showDeleteConfirm = true">{{ t('chatModule.actions.delete') }}</button>
        </template>
      </div>
    </div>

    <div v-if="!stompConnected" class="chat-reconnecting">
      <i class="pi pi-spin pi-spinner text-[10px]" /> Reconectando al chat...
    </div>

    <div v-if="conversation.visitorEmail" class="chat-info-strip">
      <span><i class="pi pi-envelope mr-1" />{{ conversation.visitorEmail }}</span>
      <span><i class="pi pi-tag mr-1" />{{ conversation.source }}</span>
    </div>

    <div ref="messagesEl" class="chat-messages">
      <div
        v-for="(msg, i) in messages"
        :key="msg.id"
        class="chat-message-row"
        :class="{
          'is-agent': msg.senderType === 'AGENT',
          'is-visitor': msg.senderType === 'VISITOR',
          'is-system': msg.senderType === 'SYSTEM',
          'is-grouped': i > 0 && messages[i - 1].senderType === msg.senderType && msg.senderType !== 'SYSTEM'
        }"
      >
        <div v-if="msg.senderType === 'SYSTEM'" class="chat-system">
          <span>{{ msg.content }}</span>
        </div>

        <template v-else-if="msg.senderType === 'VISITOR'">
          <div v-if="!isGrouped(i)" class="chat-avatar" :style="{ background: avatarColor(conversation.visitorName) }">
            {{ initials(conversation.visitorName) }}
          </div>
          <div v-else class="chat-avatar-spacer" />
          <div class="chat-bubble-group">
            <div class="chat-bubble chat-bubble-in">
              <template v-if="msg.content.startsWith('📎')">
                <i class="pi pi-paperclip mr-1 text-xs" />
                <a :href="msg.attachmentUrl ?? '#'" target="_blank" class="underline text-[var(--primary)] hover:text-[var(--primary-hover)]">{{ msg.content.replace('📎 ', '') }}</a>
              </template>
              <template v-else>{{ msg.content }}</template>
            </div>
            <div v-if="!isGrouped(i) || i === messages.length - 1 || messages[i + 1].senderType !== msg.senderType" class="chat-time">{{ formatTime(msg.createdAt) }}</div>
          </div>
        </template>

        <template v-else>
          <div class="chat-bubble-group">
            <div class="chat-bubble chat-bubble-out">
              <template v-if="msg.content.startsWith('📎')">
                <i class="pi pi-paperclip mr-1 text-xs" />
                <a :href="msg.attachmentUrl ?? '#'" target="_blank" class="underline text-white/90 hover:text-white">{{ msg.content.replace('📎 ', '') }}</a>
              </template>
              <template v-else>{{ msg.content }}</template>
            </div>
            <div v-if="!isGrouped(i) || i === messages.length - 1 || messages[i + 1].senderType !== msg.senderType" class="chat-time chat-time-right">{{ formatTime(msg.createdAt) }}</div>
          </div>
          <div v-if="msg.senderAvatarUrl" class="chat-avatar">
            <img :src="msg.senderAvatarUrl" class="w-full h-full object-cover" />
          </div>
          <div v-else class="chat-avatar" :style="{ background: avatarColor(msg.senderName ?? 'Agent') }">
            {{ initials(msg.senderName) }}
          </div>
        </template>
      </div>

      <div v-if="remoteTyping" class="chat-message-row is-visitor">
        <div class="chat-avatar" :style="{ background: avatarColor(conversation.visitorName) }">
          {{ initials(conversation.visitorName) }}
        </div>
        <div class="chat-typing">
          <span class="chat-typing-dot" style="animation-delay:0ms" />
          <span class="chat-typing-dot" style="animation-delay:150ms" />
          <span class="chat-typing-dot" style="animation-delay:300ms" />
        </div>
      </div>
    </div>

    <div v-if="showQuickReplies && filteredQuickReplies().length" class="chat-quick-replies">
      <div v-for="r in filteredQuickReplies()" :key="r.id" class="chat-quick-reply-item" @click="applyQuickReply(r)">
        <span class="chat-quick-reply-shortcut">{{ r.shortcut }}</span>
        <span class="chat-quick-reply-content">{{ r.content }}</span>
      </div>
    </div>

    <div class="chat-input-bar">
      <input ref="fileInputEl" type="file" class="hidden" @change="onFileSelected" />
      <button class="chat-input-btn" :title="t('chatModule.attachFile')" @click="openFilePicker">
        <i class="pi pi-paperclip" />
      </button>
      <textarea
        v-model="inputText"
        class="chat-input"
        rows="1"
        :placeholder="t('chatModule.messagePlaceholder')"
        @keydown="onKeyDown"
        @focus="showQuickReplies = inputText.startsWith('/')"
        @blur="hideQuickRepliesDelayed()"
      />
      <button
        class="chat-send-btn"
        :disabled="!inputText.trim()"
        title="Enviar (Enter)"
        @click="sendMessage"
      >
        <i class="pi pi-send text-sm" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Container ──────────────────────────────────────────── */
.chat-conversation {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

/* ── Header ─────────────────────────────────────────────── */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, #000));
  color: #fff;
  flex-shrink: 0;
  gap: 0.5rem;
}

.chat-header-back {
  opacity: 0.7;
  transition: opacity 150ms;
}
.chat-header-back:hover { opacity: 1; }

.chat-avatar-sm {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.chat-header-name {
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.2;
}

.chat-header-status {
  font-size: 0.6875rem;
  opacity: 0.7;
  margin-top: 0.125rem;
}

.chat-header-btn {
  font-size: 0.6875rem;
  opacity: 0.8;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: background 150ms, opacity 150ms;
  white-space: nowrap;
}
.chat-header-btn:hover { background: rgba(255, 255, 255, 0.1); opacity: 1; }

.chat-header-btn-danger {
  font-size: 0.6875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background: #ef4444;
  color: #fff;
  transition: opacity 150ms;
}
.chat-header-btn-danger:hover { opacity: 0.9; }

.chat-header-btn-danger-outline {
  font-size: 0.6875rem;
  opacity: 0.8;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: rgba(255, 255, 255, 0.8);
  transition: background 150ms, opacity 150ms;
  white-space: nowrap;
}
.chat-header-btn-danger-outline:hover { background: rgba(239, 68, 68, 0.2); opacity: 1; }

/* ── Connection banner ──────────────────────────────────── */
.chat-reconnecting {
  padding: 0.375rem 1rem;
  background: #fef3c7;
  border-bottom: 1px solid #fde68a;
  font-size: 0.75rem;
  color: #92400e;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

/* ── Info strip ─────────────────────────────────────────── */
.chat-info-strip {
  padding: 0.375rem 1rem;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

/* ── Messages ───────────────────────────────────────────── */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.chat-message-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: 78%;
  animation: fadeIn 0.2s ease;
}
.chat-message-row.is-agent {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.chat-message-row.is-visitor {
  align-self: flex-start;
}
.chat-message-row.is-system {
  align-self: center;
  max-width: 100%;
}

.chat-message-row.is-grouped {
  margin-top: 0;
}

.chat-avatar {
  width: 1.625rem;
  height: 1.625rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5625rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}

.chat-avatar-spacer {
  width: 1.625rem;
  flex-shrink: 0;
}

.chat-bubble-group {
  display: flex;
  flex-direction: column;
}

.chat-bubble {
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.45;
  word-break: break-word;
}

.chat-bubble-in {
  background: var(--surface-raised);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 1rem 1rem 1rem 0.25rem;
}

.chat-bubble-out {
  background: linear-gradient(135deg, #6366f1, #7c3aed);
  color: #fff;
  border-radius: 1rem 1rem 0.25rem 1rem;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
}

.chat-time {
  font-size: 0.625rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
  margin-left: 0.25rem;
  padding-bottom: 0.25rem;
}

.chat-time-right {
  text-align: right;
  margin-right: 0.25rem;
}

/* ── System message ─────────────────────────────────────── */
.chat-system {
  font-size: 0.6875rem;
  color: var(--text-muted);
  background: var(--bg-subtle);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid var(--border);
}

/* ── Typing indicator ───────────────────────────────────── */
.chat-typing {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 1rem 1rem 1rem 0.25rem;
  padding: 0.625rem 0.875rem;
}

.chat-typing-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: var(--text-muted);
  animation: bounce 1.2s infinite;
}

/* ── Quick replies ──────────────────────────────────────── */
.chat-quick-replies {
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
  max-height: 9rem;
  overflow-y: auto;
}

.chat-quick-reply-item {
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background 150ms;
}
.chat-quick-reply-item:hover { background: var(--bg); }

.chat-quick-reply-shortcut {
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  color: var(--primary);
  flex-shrink: 0;
}

.chat-quick-reply-content {
  font-size: 0.75rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Input bar ───────────────────────────────────────────── */
.chat-input-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.chat-input-btn {
  color: var(--text-muted);
  padding: 0.375rem;
  border-radius: 0.375rem;
  transition: color 150ms, background 150ms;
}
.chat-input-btn:hover { color: var(--primary); background: var(--surface-raised); }

.chat-input {
  flex: 1;
  resize: none;
  font-size: 0.875rem;
  background: var(--bg-subtle);
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  outline: none;
  border: 1px solid var(--border);
  transition: border-color 150ms, box-shadow 150ms;
  color: var(--text);
  font-family: inherit;
  line-height: 1.4;
}
.chat-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}

.chat-send-btn {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9999px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 150ms;
  flex-shrink: 0;
}
.chat-send-btn:hover { opacity: 0.9; }
.chat-send-btn:disabled { opacity: 0.4; cursor: default; }

/* ── Animations ──────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}

/* ── Scrollbar ───────────────────────────────────────────── */
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
.chat-messages::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
</style>
