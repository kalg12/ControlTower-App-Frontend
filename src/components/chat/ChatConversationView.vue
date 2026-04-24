<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { Client as StompClient } from '@stomp/stompjs'
import { useAuthStore } from '@/stores/auth'
import { chatService } from '@/services/chat.service'
import { qk } from '@/queries/keys'
import type { ChatConversation, ChatMessage, ChatMessagePayload, ChatQuickReply } from '@/types/chat'

const props = defineProps<{ conversation: ChatConversation }>()
const emit = defineEmits<{
  close: []
  transfer: []
  closed: []
}>()

const auth = useAuthStore()
const qc = useQueryClient()
const messagesEl = ref<HTMLElement | null>(null)
const inputText = ref('')
const isTyping = ref(false)
const typingTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const showQuickReplies = ref(false)
const messages = ref<ChatMessage[]>([])
const remoteTyping = ref(false)
let remoteTypingTimer: ReturnType<typeof setTimeout> | null = null

// ── Load initial messages ────────────────────────────────────────────────────

const { data: convData } = useQuery({
  queryKey: qk.chatConversation(props.conversation.id),
  queryFn: () => chatService.getConversation(props.conversation.id),
})

watch(convData, (data) => {
  if (data?.messages) {
    messages.value = data.messages
    nextTick(scrollBottom)
  }
}, { immediate: true })

const { data: quickReplies } = useQuery({
  queryKey: qk.chatQuickReplies(),
  queryFn: () => chatService.getQuickReplies(),
})

// ── STOMP subscription ───────────────────────────────────────────────────────

const stompClient = ref<StompClient | null>(null)

onMounted(() => {
  if (!auth.accessToken) return
  const baseUrl = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080').replace(/\/ws$/, '')
  const client = new StompClient({
    brokerURL: `${baseUrl}/ws`,
    connectHeaders: { Authorization: `Bearer ${auth.accessToken}` },
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(`/topic/chat.${props.conversation.id}`, (frame) => {
        const payload: ChatMessagePayload = JSON.parse(frame.body)
        if (payload.type === 'MESSAGE' || payload.type === 'SYSTEM') {
          messages.value.push({
            id: payload.id ?? crypto.randomUUID(),
            conversationId: payload.conversationId,
            senderType: payload.senderType ?? 'SYSTEM',
            senderId: payload.senderId,
            senderName: payload.senderName,
            senderAvatarUrl: payload.senderAvatarUrl,
            content: payload.content ?? '',
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
  })
  client.activate()
  stompClient.value = client
  chatService.markRead(props.conversation.id)
})

onUnmounted(() => {
  stompClient.value?.deactivate()
  if (remoteTypingTimer) clearTimeout(remoteTypingTimer)
})

// ── Send message ─────────────────────────────────────────────────────────────

const sendMut = useMutation({
  mutationFn: (content: string) => {
    const agentId = auth.user?.id
    if (!agentId) throw new Error('Not authenticated')
    stompClient.value?.publish({
      destination: '/app/chat.agent.message',
      body: JSON.stringify({ content, conversationId: props.conversation.id }),
    })
    return Promise.resolve()
  },
})

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  if (text.startsWith('/')) {
    const reply = quickReplies.value?.find((r: ChatQuickReply) => text === r.shortcut)
    if (reply) { inputText.value = reply.content; return }
  }
  sendMut.mutate(text)
  inputText.value = ''
  showQuickReplies.value = false
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
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

// ── Close ────────────────────────────────────────────────────────────────────

const closeMut = useMutation({
  mutationFn: () => chatService.close(props.conversation.id),
  onSuccess: () => emit('closed'),
})

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function filteredQuickReplies() {
  const q = inputText.value.toLowerCase()
  return (quickReplies.value ?? []).filter((r: ChatQuickReply) => r.shortcut.includes(q) || r.content.toLowerCase().includes(q)).slice(0, 5)
}

function applyQuickReply(r: ChatQuickReply) {
  inputText.value = r.content
  showQuickReplies.value = false
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-[var(--primary)] text-white flex-shrink-0">
      <div class="flex items-center gap-3">
        <button class="opacity-70 hover:opacity-100" @click="emit('close')">
          <i class="pi pi-arrow-left" />
        </button>
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
             :style="{ background: avatarColor(conversation.visitorName) }">
          {{ initials(conversation.visitorName) }}
        </div>
        <div>
          <div class="font-semibold text-sm leading-none">{{ conversation.visitorName }}</div>
          <div class="text-[10px] opacity-80 mt-0.5">
            {{ conversation.status === 'ACTIVE' ? '● En vivo' : conversation.status === 'WAITING' ? 'Esperando agente' : conversation.status }}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="conversation.status === 'ACTIVE'" class="text-xs opacity-80 hover:opacity-100 px-2 py-1 rounded border border-white/30 hover:bg-white/10" @click="emit('transfer')">
          Transferir
        </button>
        <button v-if="conversation.status === 'ACTIVE'" class="text-xs opacity-80 hover:opacity-100 px-2 py-1 rounded border border-white/30 hover:bg-white/10" @click="closeMut.mutate()">
          Cerrar
        </button>
      </div>
    </div>

    <!-- Visitor info strip -->
    <div v-if="conversation.visitorEmail" class="px-4 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center gap-3">
      <span><i class="pi pi-envelope mr-1" />{{ conversation.visitorEmail }}</span>
      <span><i class="pi pi-tag mr-1" />{{ conversation.source }}</span>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="{
          'flex justify-end': msg.senderType === 'AGENT',
          'flex justify-start': msg.senderType === 'VISITOR',
          'flex justify-center': msg.senderType === 'SYSTEM',
        }"
      >
        <!-- System message -->
        <div v-if="msg.senderType === 'SYSTEM'" class="text-[10px] text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1 rounded-full">
          {{ msg.content }}
        </div>

        <!-- Visitor message -->
        <div v-else-if="msg.senderType === 'VISITOR'" class="flex items-end gap-2 max-w-[75%]">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
               :style="{ background: avatarColor(conversation.visitorName) }">
            {{ initials(conversation.visitorName) }}
          </div>
          <div>
            <div class="bg-white border border-[var(--border)] rounded-2xl rounded-bl-sm px-3 py-2 text-sm">{{ msg.content }}</div>
            <div class="text-[10px] text-[var(--text-muted)] mt-0.5 ml-1">{{ formatTime(msg.createdAt) }}</div>
          </div>
        </div>

        <!-- Agent message -->
        <div v-else class="flex items-end gap-2 max-w-[75%] flex-row-reverse">
          <div v-if="msg.senderAvatarUrl" class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
            <img :src="msg.senderAvatarUrl" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
               :style="{ background: avatarColor(msg.senderName ?? 'Agent') }">
            {{ initials(msg.senderName) }}
          </div>
          <div>
            <div class="bg-[var(--primary)] text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm">{{ msg.content }}</div>
            <div class="text-[10px] text-[var(--text-muted)] mt-0.5 mr-1 text-right">{{ formatTime(msg.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- Remote typing -->
      <div v-if="remoteTyping" class="flex items-center gap-2">
        <div class="bg-white border border-[var(--border)] rounded-2xl px-3 py-2 flex gap-1">
          <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms" />
          <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms" />
          <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms" />
        </div>
      </div>
    </div>

    <!-- Quick replies popup -->
    <div v-if="showQuickReplies && filteredQuickReplies().length" class="border-t border-[var(--border)] bg-[var(--bg-subtle)] max-h-36 overflow-y-auto">
      <div
        v-for="r in filteredQuickReplies()"
        :key="r.id"
        class="px-4 py-2 hover:bg-[var(--bg)] cursor-pointer flex items-center gap-2"
        @click="applyQuickReply(r)"
      >
        <span class="text-xs font-mono text-[var(--primary)] flex-shrink-0">{{ r.shortcut }}</span>
        <span class="text-xs text-[var(--text-muted)] truncate">{{ r.content }}</span>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-[var(--border)] px-3 py-2 flex items-center gap-2 flex-shrink-0 bg-[var(--bg)]">
      <button class="text-[var(--text-muted)] hover:text-[var(--text)] p-1 opacity-40 cursor-not-allowed" title="Próximamente: adjuntar archivos">
        <i class="pi pi-plus" />
      </button>
      <textarea
        v-model="inputText"
        class="flex-1 resize-none text-sm bg-[var(--bg-subtle)] rounded-xl px-3 py-2 outline-none border border-[var(--border)] focus:border-[var(--primary)] transition-colors"
        rows="1"
        placeholder="Escribe un mensaje... (Ctrl+Enter para enviar)"
        @keydown="onKeyDown"
        @focus="showQuickReplies = inputText.startsWith('/')"
        @blur="setTimeout(() => showQuickReplies = false, 200)"
      />
      <button
        class="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
        :disabled="!inputText.trim()"
        @click="sendMessage"
      >
        <i class="pi pi-send text-sm" />
      </button>
    </div>
  </div>
</template>
