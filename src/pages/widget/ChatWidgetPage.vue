<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { Client as StompClient } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { publicChatService } from "@/services/public-chat.service";
import type {
  ChatMessage,
  ChatMessagePayload,
  ConversationStatus,
} from "@/types/chat";

const route = useRoute();

// ── State ────────────────────────────────────────────────────────────────────

const tenantId = computed(() => route.query.tenantId as string);
const source = computed(() => (route.query.source as string) || "POS");
const screen = ref<"welcome" | "chat" | "rating" | "thankyou">("welcome");
const selectedRating = ref(0);
const ratingComment = ref("");
const ratingSubmitting = ref(false);
const minimized = ref(false);
const visitorName = ref("");
const visitorEmail = ref("");
const inputText = ref("");
const messages = ref<ChatMessage[]>([]);
const convStatus = ref<ConversationStatus>("WAITING");
const agentName = ref<string | null>(null);
const agentAvatarUrl = ref<string | null>(null);
const loading = ref(false);
const error = ref("");
const messagesEl = ref<HTMLElement | null>(null);
const remoteTyping = ref(false);
let remoteTypingTimer: ReturnType<typeof setTimeout> | null = null;
let typingTimer: ReturnType<typeof setTimeout> | null = null;

// Persist visitorId across sessions, tokens per session
const visitorId =
  localStorage.getItem("ct:visitorId") ??
  (() => {
    const id = crypto.randomUUID();
    localStorage.setItem("ct:visitorId", id);
    return id;
  })();

let conversationId = sessionStorage.getItem("ct:conversationId") ?? "";
let visitorToken = sessionStorage.getItem("ct:visitorToken") ?? "";

const stompClient = ref<StompClient | null>(null);
const stompConnected = ref(false);
let pendingMessage: string | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Tracks content of messages added optimistically so the STOMP echo is deduped
const _sentContents = new Set<string>();
// Tracks optimistic IDs currently in-flight (REST not yet returned) to prevent poll duplicates
const _pendingOptimisticIds = new Set<string>();

// ── Resume session ────────────────────────────────────────────────────────────

onMounted(async () => {
  if (conversationId && visitorToken) {
    screen.value = "chat";
    await loadMessages();
    connectStomp();
    startPolling();
  }
});

onUnmounted(() => {
  stompClient.value?.deactivate()
  stopPolling()
})

// ── Start chat ────────────────────────────────────────────────────────────────

async function startChat() {
  if (!visitorName.value.trim() || !tenantId.value) return;
  loading.value = true;
  error.value = "";
  try {
    const res = await publicChatService.startChat({
      tenantId: tenantId.value,
      visitorName: visitorName.value.trim(),
      visitorEmail: visitorEmail.value.trim(),
      visitorId,
      source: source.value,
    });
    conversationId = res.conversationId;
    visitorToken = res.visitorToken;
    sessionStorage.setItem("ct:conversationId", conversationId);
    sessionStorage.setItem("ct:visitorToken", visitorToken);
    window.parent?.postMessage({ type: "CT_CONVERSATION_STARTED" }, "*");
    screen.value = "chat";
    connectStomp();
    startPolling();
  } catch (e) {
    error.value = "No se pudo iniciar el chat. Intenta de nuevo.";
  } finally {
    loading.value = false;
  }
}

// ── Load history ──────────────────────────────────────────────────────────────

async function loadMessages() {
  try {
    const data = await publicChatService.getMessages(
      conversationId,
      visitorToken,
    );
    messages.value = data.content ?? [];
    nextTick(scrollBottom);
  } catch {}
}

// ── STOMP ─────────────────────────────────────────────────────────────────────

function startPolling() {
  stopPolling()
  pollInterval = setInterval(async () => {
    if (screen.value !== "chat" || !conversationId || !visitorToken) return
    try {
      const [msgData, convInfo] = await Promise.all([
        publicChatService.getMessages(conversationId, visitorToken),
        publicChatService.getConversation(conversationId, visitorToken),
      ])
      // Merge new messages — two-phase to avoid duplicates from the optimistic+poll race:
      // If a server message matches a pending optimistic (same content+senderType), swap it
      // in-place so the REST .then() handler finds nothing to do.
      const existingIds = new Set(messages.value.map(m => m.id))
      let added = false
      for (const msg of (msgData.content ?? [])) {
        if (existingIds.has(msg.id)) continue
        const optimisticIdx = messages.value.findIndex(
          m => _pendingOptimisticIds.has(m.id) && m.content === msg.content && m.senderType === msg.senderType
        )
        if (optimisticIdx !== -1) {
          _pendingOptimisticIds.delete(messages.value[optimisticIdx].id)
          messages.value.splice(optimisticIdx, 1, msg)
        } else {
          messages.value.push(msg)
        }
        added = true
      }
      if (added) nextTick(scrollBottom)
      // Sync conversation status (e.g., agent claimed/closed)
      if (convInfo.status) convStatus.value = convInfo.status
      if (convInfo.agentName) agentName.value = convInfo.agentName
      if (convInfo.agentAvatarUrl) agentAvatarUrl.value = convInfo.agentAvatarUrl
      if (convInfo.status === "CLOSED" && screen.value === "chat") {
        sessionStorage.removeItem("ct:conversationId")
        sessionStorage.removeItem("ct:visitorToken")
        window.parent?.postMessage({ type: "CT_CHAT_CLOSED" }, "*")
        screen.value = "rating"
      }
    } catch {}
  }, 6000)
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}

function connectStomp() {
  const wsUrl =
    (import.meta.env.VITE_WS_URL as string | undefined) ||
    (() => {
      const base = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? '')
        .replace(/\/api\/v1$/, '').replace(/\/$/, '')
      return base ? `${base}/ws` : `${window.location.origin}/ws`
    })()
  const client = new StompClient({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: { "X-Visitor-Token": visitorToken },
    reconnectDelay: 5000,
    onConnect: async () => {
      stompConnected.value = true;

      client.subscribe(`/topic/chat.${conversationId}`, (frame) => {
        const payload: ChatMessagePayload = JSON.parse(frame.body);

        if (payload.type === "MESSAGE" || payload.type === "SYSTEM") {
          // Skip if already present by server-assigned ID
          if (payload.id && messages.value.some(m => m.id === payload.id)) {
            // nothing
          } else if (payload.senderType === "VISITOR" && payload.content && _sentContents.has(payload.content)) {
            // Visitor's own STOMP echo: swap the optimistic message's random UUID with
            // the real server UUID so that the poll can correctly deduplicate it later.
            _sentContents.delete(payload.content);
            const idx = messages.value.findIndex(m => m.senderType === "VISITOR" && m.content === payload.content);
            if (idx !== -1 && payload.id) {
              messages.value.splice(idx, 1, { ...messages.value[idx], id: payload.id, createdAt: payload.createdAt });
            }
          } else {
            messages.value.push({
              id: payload.id ?? crypto.randomUUID(),
              conversationId,
              senderType: payload.senderType ?? "SYSTEM",
              senderId: payload.senderId,
              senderName: payload.senderName,
              senderAvatarUrl: payload.senderAvatarUrl,
              content: payload.content ?? "",
              isRead: payload.isRead ?? false,
              createdAt: payload.createdAt,
            });
            nextTick(scrollBottom);
          }
          if (payload.senderType === "AGENT") {
            window.parent?.postMessage({ type: "CT_NEW_MESSAGE" }, "*");
          }
        } else if (payload.type === "STATUS_CHANGED") {
          if (payload.conversationStatus)
            convStatus.value = payload.conversationStatus;
          if (payload.senderName) agentName.value = payload.senderName;
          if (payload.senderAvatarUrl)
            agentAvatarUrl.value = payload.senderAvatarUrl;
          if (payload.conversationStatus === "CLOSED") {
            sessionStorage.removeItem("ct:conversationId");
            sessionStorage.removeItem("ct:visitorToken");
            window.parent?.postMessage({ type: "CT_CHAT_CLOSED" }, "*");
            // Transition to rating screen
            screen.value = "rating";
          }
        } else if (
          payload.type === "TYPING" &&
          payload.senderType === "AGENT"
        ) {
          remoteTyping.value = true;
          if (remoteTypingTimer) clearTimeout(remoteTypingTimer);
          remoteTypingTimer = setTimeout(() => {
            remoteTyping.value = false;
          }, 3000);
        }
      });

      // Sync current conversation status from REST — fixes race condition where
      // STATUS_CHANGED fires before the STOMP subscription is established
      try {
        const info = await publicChatService.getConversation(
          conversationId,
          visitorToken,
        );
        if (info.status) convStatus.value = info.status;
        if (info.agentName) agentName.value = info.agentName;
        if (info.agentAvatarUrl) agentAvatarUrl.value = info.agentAvatarUrl;
        if (info.status === "CLOSED") {
          sessionStorage.removeItem("ct:conversationId");
          sessionStorage.removeItem("ct:visitorToken");
          screen.value = "rating";
        }
      } catch {}

      // Send queued message (typed before STOMP was ready)
      if (pendingMessage) {
        client.publish({
          destination: "/app/chat.visitor.message",
          body: JSON.stringify({ content: pendingMessage }),
        });
        pendingMessage = null;
      }

      client.publish({
        destination: "/app/chat.visitor.join",
        body: JSON.stringify({ conversationId }),
      });
    },
    onDisconnect: () => {
      stompConnected.value = false;
    },
    onStompError: () => {
      stompConnected.value = false;
    },
    onWebSocketError: () => {
      stompConnected.value = false;
    },
  });
  client.activate();
  stompClient.value = client;
}

// ── Rating ────────────────────────────────────────────────────────────────────

async function submitRating() {
  if (!selectedRating.value) return;
  ratingSubmitting.value = true;
  try {
    await publicChatService.rateConversation(
      conversationId,
      visitorToken,
      selectedRating.value,
      ratingComment.value.trim() || undefined,
    );
  } catch {}
  ratingSubmitting.value = false;
  screen.value = "thankyou";
}

// ── Send message ──────────────────────────────────────────────────────────────

function sendMessage() {
  const text = inputText.value.trim();
  if (!text) return;
  inputText.value = "";

  // Optimistic display with a stable temp ID so the REST swap is exact.
  const optimisticId = crypto.randomUUID();
  _pendingOptimisticIds.add(optimisticId);
  messages.value.push({
    id: optimisticId,
    conversationId,
    senderType: "VISITOR" as const,
    senderName: visitorName.value,
    content: text,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  nextTick(scrollBottom);

  // Always send via REST: guarantees DB persistence + server-side STOMP broadcast.
  // STOMP is only used as a last-resort fallback if REST fails.
  publicChatService.sendMessage(conversationId, visitorToken, text)
    .then(msg => {
      _pendingOptimisticIds.delete(optimisticId);
      // Swap optimistic with real only if poll hasn't already done it.
      const idx = messages.value.findIndex(m => m.id === optimisticId);
      if (idx !== -1) {
        messages.value.splice(idx, 1, msg);
      } else if (!messages.value.some(m => m.id === msg.id)) {
        messages.value.push(msg);
      }
    })
    .catch(() => {
      _pendingOptimisticIds.delete(optimisticId);
      // REST failed — keep optimistic and try STOMP as last resort
      if (stompConnected.value) {
        _sentContents.add(text);
        stompClient.value?.publish({
          destination: "/app/chat.visitor.message",
          body: JSON.stringify({ content: text, conversationId }),
        });
      }
    });
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
    return;
  }
  sendTypingSignal();
}

function sendTypingSignal() {
  if (!stompClient.value?.connected) return;
  if (typingTimer) clearTimeout(typingTimer);
  stompClient.value.publish({
    destination: "/app/chat.typing",
    body: JSON.stringify({ conversationId }),
  });
  typingTimer = setTimeout(() => {}, 2000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scrollBottom() {
  if (messagesEl.value)
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(h)];
}

function formatTime(ts: unknown): string {
  if (!ts) return "";
  if (typeof ts === "object" && ts !== null && "epochSecond" in ts) {
    return new Date((ts as { epochSecond: number }).epochSecond * 1000)
      .toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }
  const d = new Date(ts as string);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
</script>

<template>
  <!-- Minimized floating button -->
  <div v-if="minimized" class="fixed bottom-4 right-4">
    <button
      class="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
      style="background: #f97316"
      @click="minimized = false"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </button>
  </div>

  <!-- Widget container (always light mode — force color-scheme so CSS vars don't bleed in) -->
  <div
    v-else
    class="fixed inset-0 flex flex-col bg-white font-sans"
    style="
      font-family:
        -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif;
      color-scheme: light;
      color: #111827;
    "
  >
    <!-- ── WELCOME SCREEN ─────────────────────────────────────────────── -->
    <div v-if="screen === 'welcome'" class="flex flex-col h-full">
      <!-- Hero -->
      <div
        class="flex-shrink-0 p-6 flex flex-col items-center justify-center text-white"
        style="
          background: linear-gradient(135deg, #f97316, #ea580c);
          min-height: 200px;
        "
      >
        <div
          class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4"
        >
          <svg
            class="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-center leading-tight">
          ¿Tienes dudas?
        </h1>
        <p class="text-white/80 text-sm text-center mt-1">Chat en vivo ahora</p>
      </div>

      <!-- Form -->
      <div class="flex-1 flex flex-col justify-center px-6 py-8 gap-4">
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1"
            >Tu nombre *</label
          >
          <input
            v-model="visitorName"
            type="text"
            placeholder="¿Cómo te llamas?"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white outline-none focus:border-orange-400 transition-colors"
            @keydown.enter="startChat"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1"
            >Correo electrónico
            <span class="text-gray-400 font-normal">(opcional)</span></label
          >
          <input
            v-model="visitorEmail"
            type="email"
            placeholder="correo@ejemplo.com"
            class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white outline-none focus:border-orange-400 transition-colors"
            @keydown.enter="startChat"
          />
        </div>
        <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>
        <button
          class="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
          style="background: #f97316"
          :class="
            loading || !visitorName.trim()
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-90'
          "
          :disabled="loading || !visitorName.trim()"
          @click="startChat"
        >
          <span v-if="loading">Iniciando...</span>
          <template v-else>
            Iniciar Conversación
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </template>
        </button>
      </div>
    </div>

    <!-- ── CHAT SCREEN ────────────────────────────────────────────────── -->
    <div v-else-if="screen === 'chat'" class="flex flex-col h-full">
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style="background: #f97316"
      >
        <div class="flex items-center gap-3">
          <div v-if="agentName">
            <img
              v-if="agentAvatarUrl"
              :src="agentAvatarUrl"
              class="w-9 h-9 rounded-full object-cover border-2 border-white/50"
            />
            <div
              v-else
              class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white/50"
              :style="{ background: avatarColor(agentName) }"
            >
              {{ initials(agentName) }}
            </div>
          </div>
          <div
            v-else
            class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div class="text-white">
            <div class="font-semibold text-sm">
              {{ agentName ?? "Soporte" }}
            </div>
            <div class="text-[11px] text-white/80">
              {{
                convStatus === "WAITING"
                  ? "● Esperando agente..."
                  : convStatus === "ACTIVE"
                    ? "● En línea"
                    : convStatus === "CLOSED"
                      ? "Conversación cerrada"
                      : convStatus
              }}
            </div>
          </div>
        </div>
        <button
          class="text-white/80 hover:text-white transition-colors"
          @click="minimized = true"
          title="Minimizar"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 12H4"
            />
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div
        ref="messagesEl"
        class="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
      >
        <!-- Empty state -->
        <div
          v-if="messages.length === 0"
          class="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2"
        >
          <div
            class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <span>Esperando a un agente...</span>
        </div>

        <div v-for="msg in messages" :key="msg.id">
          <!-- System -->
          <div v-if="msg.senderType === 'SYSTEM'" class="flex justify-center">
            <span
              class="text-[10px] text-gray-400 bg-gray-100 rounded-full px-3 py-1"
              >{{ msg.content }}</span
            >
          </div>

          <!-- Agent -->
          <div
            v-else-if="msg.senderType === 'AGENT'"
            class="flex items-end gap-2"
          >
            <img
              v-if="msg.senderAvatarUrl"
              :src="msg.senderAvatarUrl"
              class="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
            <div
              v-else
              class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              :style="{ background: avatarColor(msg.senderName ?? 'Agent') }"
            >
              {{ initials(msg.senderName ?? "Agent") }}
            </div>
            <div class="max-w-[75%]">
              <div class="text-[10px] text-gray-400 mb-0.5 ml-1">
                {{ msg.senderName }} · {{ formatTime(msg.createdAt) }}
              </div>
              <div
                class="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-800 shadow-sm"
              >
                {{ msg.content }}
              </div>
            </div>
          </div>

          <!-- Visitor -->
          <div v-else class="flex justify-end">
            <div class="max-w-[75%]">
              <div
                class="rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white shadow-sm"
                style="background: #f97316"
              >
                {{ msg.content }}
              </div>
              <div class="text-[10px] text-gray-400 mt-0.5 mr-1 text-right">
                {{ formatTime(msg.createdAt) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Agent typing -->
        <div v-if="remoteTyping" class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
          <div
            class="bg-white border border-gray-200 rounded-2xl px-3 py-2 flex gap-1 shadow-sm"
          >
            <span
              class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 0ms"
            />
            <span
              class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 150ms"
            />
            <span
              class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style="animation-delay: 300ms"
            />
          </div>
        </div>
      </div>

      <!-- Closed banner (while still on chat screen, before rating triggers) -->
      <div
        v-if="convStatus === 'CLOSED'"
        class="px-4 py-2 bg-gray-100 text-center text-sm text-gray-500"
      >
        Esta conversación ha sido cerrada.
      </div>

      <!-- Input -->
      <div
        v-if="convStatus !== 'CLOSED'"
        class="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0"
      >
        <button
          class="p-2 text-gray-300 cursor-not-allowed"
          title="Próximamente: adjuntar archivos"
          disabled
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
        <input
          v-model="inputText"
          type="text"
          placeholder="Escribe un mensaje..."
          class="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 bg-white outline-none focus:border-orange-400 transition-colors"
          @keydown="onKeyDown"
        />
        <button
          class="w-9 h-9 rounded-full flex items-center justify-center text-white transition-opacity flex-shrink-0"
          style="background: #f97316"
          :class="
            !inputText.trim()
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:opacity-90'
          "
          :disabled="!inputText.trim()"
          title="Enviar"
          @click="sendMessage"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- ── RATING SCREEN ─────────────────────────────────────────────── -->
    <div
      v-else-if="screen === 'rating'"
      class="flex flex-col h-full items-center justify-center px-6 gap-5 text-center"
    >
      <!-- Icon -->
      <div
        class="w-16 h-16 rounded-full flex items-center justify-center"
        style="background: #fff7ed"
      >
        <svg class="w-8 h-8" fill="none" stroke="#f97316" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </div>
      <div>
        <h2 class="text-lg font-bold text-gray-800">¿Cómo fue tu atención?</h2>
        <p class="text-sm text-gray-500 mt-1">Tu opinión nos ayuda a mejorar</p>
      </div>

      <!-- Stars -->
      <div class="flex gap-3">
        <button
          v-for="n in 5"
          :key="n"
          class="text-3xl transition-transform hover:scale-125 focus:outline-none"
          :class="n <= selectedRating ? 'opacity-100' : 'opacity-30'"
          @click="selectedRating = n"
        >
          ★
        </button>
      </div>

      <!-- Comment -->
      <textarea
        v-model="ratingComment"
        rows="3"
        placeholder="Cuéntanos más (opcional)..."
        class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-white outline-none focus:border-orange-400 transition-colors resize-none"
      />

      <!-- Actions -->
      <button
        class="w-full py-3 rounded-xl font-semibold text-white transition-opacity"
        style="background: #f97316"
        :class="
          !selectedRating || ratingSubmitting
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:opacity-90'
        "
        :disabled="!selectedRating || ratingSubmitting"
        @click="submitRating"
      >
        {{ ratingSubmitting ? "Enviando..." : "Enviar evaluación" }}
      </button>
      <button
        class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        @click="screen = 'thankyou'"
      >
        Omitir
      </button>
    </div>

    <!-- ── THANK YOU SCREEN ───────────────────────────────────────────── -->
    <div
      v-else-if="screen === 'thankyou'"
      class="flex flex-col h-full items-center justify-center px-6 gap-5 text-center"
    >
      <div
        class="w-20 h-20 rounded-full flex items-center justify-center"
        style="background: #f0fdf4"
      >
        <svg class="w-10 h-10" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div>
        <h2 class="text-xl font-bold text-gray-800">¡Gracias!</h2>
        <p class="text-sm text-gray-500 mt-2">
          Tu evaluación ha sido registrada.<br />Hasta pronto 👋
        </p>
      </div>
    </div>
  </div>
</template>
