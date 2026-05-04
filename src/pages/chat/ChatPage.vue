<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import { Client as StompClient } from "@stomp/stompjs";
import { useAuthStore } from "@/stores/auth";
import { chatService } from "@/services/chat.service";
import { qk } from "@/queries/keys";
import type { ChatConversation, ConversationStatus } from "@/types/chat";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import Tag from "primevue/tag";
import ChatConversationView from "@/components/chat/ChatConversationView.vue";
import ChatTransferDialog from "@/components/chat/ChatTransferDialog.vue";
import { MessageSquare } from "lucide-vue-next";

const { t } = useI18n();

const auth = useAuthStore();
const qc = useQueryClient();

const activeTab = ref<ConversationStatus | "ALL">("ALL");
const search = ref("");
const selectedConv = ref<ChatConversation | null>(null);
const showTransfer = ref(false);
const hoveredId = ref<string | null>(null);

const tabs = computed(() => [
  { label: t("chatModule.tabs.all"), value: "ALL" as const },
  { label: t("chatModule.tabs.waiting"), value: "WAITING" as const },
  { label: t("chatModule.tabs.active"), value: "ACTIVE" as const },
  { label: t("chatModule.tabs.closed"), value: "CLOSED" as const },
  { label: t("chatModule.tabs.archived"), value: "ARCHIVED" as const },
]);

const queryStatus = computed<ConversationStatus | undefined>(() =>
  activeTab.value === "ALL" ? undefined : activeTab.value,
);

const { data, isLoading, refetch } = useQuery({
  queryKey: computed(() => qk.chatConversations(queryStatus.value)),
  queryFn: () =>
    chatService.listConversations({ status: queryStatus.value, size: 100 }),
  refetchInterval: 15000,
});

const allConversations = computed(() => data.value?.content ?? []);

const conversations = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return allConversations.value;
  return allConversations.value.filter(
    (c) =>
      c.visitorName?.toLowerCase().includes(q) ||
      c.visitorEmail?.toLowerCase().includes(q),
  );
});

const waitingCount = computed(
  () => allConversations.value.filter((c) => c.status === "WAITING").length,
);

function invalidate() {
  qc.invalidateQueries({ queryKey: ["chat-conversations"] });
  qc.invalidateQueries({ queryKey: qk.chatUnreadCount() });
}

const claimMut = useMutation({
  mutationFn: (id: string) => chatService.claim(id),
  onSuccess: (conv) => {
    invalidate();
    selectedConv.value = conv;
  },
});

const closeMut = useMutation({
  mutationFn: (id: string) => chatService.close(id),
  onSuccess: () => {
    invalidate();
    selectedConv.value = null;
  },
});

const archiveMut = useMutation({
  mutationFn: (id: string) => chatService.archive(id),
  onSuccess: () => {
    invalidate();
    selectedConv.value = null;
  },
});

const unarchiveMut = useMutation({
  mutationFn: (id: string) => chatService.unarchive(id),
  onSuccess: () => {
    invalidate();
    selectedConv.value = null;
  },
});

const deleteMut = useMutation({
  mutationFn: (id: string) => chatService.delete(id),
  onSuccess: () => {
    invalidate();
    if (selectedConv.value?.id === deleteMut.variables.value) selectedConv.value = null;
  },
});

const confirmDeleteId = ref<string | null>(null);

// ── Online agents panel ──────────────────────────────────────────────────────

const { data: onlineAgents } = useQuery({
  queryKey: qk.chatOnlineAgents(),
  queryFn: () => chatService.getOnlineAgents(),
  refetchInterval: 30000,
  enabled: computed(() => auth.hasPermission("chat:read")),
});

function statusSeverity(status: ConversationStatus) {
  const map: Record<ConversationStatus, string> = {
    WAITING: "warn",
    ACTIVE: "success",
    TRANSFERRED: "info",
    CLOSED: "secondary",
    ARCHIVED: "secondary",
  };
  return map[status] ?? "secondary";
}

function statusLabel(status: ConversationStatus) {
  return t(`chatModule.status.${status.toLowerCase()}`);
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("chatModule.time.now");
  if (m < 60) return `${m} ${t("chatModule.time.minutes")}`;
  if (m < 1440) return `${Math.floor(m / 60)}${t("chatModule.time.hours")}`;
  return `${Math.floor(m / 1440)}${t("chatModule.time.days")}`;
}

function lastMessage(conv: ChatConversation): string {
  const msgs = conv.messages;
  if (!msgs || msgs.length === 0) return t("chatModule.noMessages");
  const last = msgs[msgs.length - 1];
  return (
    last.content ?? (last.attachmentUrl ? t("chatModule.attachment") : "...")
  );
}

function avatarInitial(name?: string) {
  return (name ?? "?").charAt(0).toUpperCase();
}

function avatarColor(name?: string) {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#ef4444",
  ];
  const idx = (name ?? "").charCodeAt(0) % colors.length;
  return colors[idx];
}

function emptyLabel() {
  const key = activeTab.value === "ALL" ? "all" : activeTab.value.toLowerCase();
  return t(`chatModule.empty.${key}`, key);
}

function agentInitials(name: string) {
  return name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function agentColor(name: string) {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#ef4444",
  ];
  const idx = (name ?? "").charCodeAt(0) % colors.length;
  return colors[idx];
}

// ── Agent presence ─────────────────────────────────────────────────────────

const isOnline = ref(false);

async function togglePresence() {
  const next = !isOnline.value;
  await chatService.setPresence(next).catch(() => {});
  isOnline.value = next;
  sessionStorage.setItem("ct_agent_online", String(next));
}

// ── STOMP real-time ────────────────────────────────────────────────────────

const stompClient = ref<StompClient | null>(null);

onMounted(async () => {
  // Fast restore: sessionStorage survives F5 in the same tab
  if (sessionStorage.getItem("ct_agent_online") === "true") {
    isOnline.value = true;
    // Re-establish DB state in case server restarted
    chatService.setPresence(true).catch(() => {});
  } else {
    // Authoritative sync from DB (handles fresh logins)
    try {
      isOnline.value = await chatService.getMyPresence();
      sessionStorage.setItem("ct_agent_online", String(isOnline.value));
    } catch {}
  }

  if (!auth.hasPermission("chat:read") || !auth.accessToken) return;
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? "").replace(/\/$/, "");
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = apiBase ? apiBase.replace(/^http/, "ws") + "/ws" : `${proto}//${window.location.host}/ws`;
  const client = new StompClient({
    brokerURL: wsUrl,
    connectHeaders: { Authorization: `Bearer ${auth.accessToken}` },
    reconnectDelay: 5000,
    onConnect: () => {
      const tenantId = auth.user?.tenantId;
      if (!tenantId) return;
      client.subscribe(`/topic/chat.queue.${tenantId}`, () => invalidate());
    },
  });
  client.activate();
  stompClient.value = client;
});

onUnmounted(() => {
  stompClient.value?.deactivate();
  // Presence stays active when navigating within the app.
  // The browser beforeunload event handles actual tab/window close.
});

// Set offline when the tab/window is actually closed (not on navigation)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (isOnline.value) {
      chatService.setPresence(false).catch(() => {});
      sessionStorage.removeItem("ct_agent_online");
    }
  });
}
</script>

<template>
  <div class="flex gap-4 h-full min-h-0">
    <!-- Left inbox panel -->
    <div
      class="flex flex-col min-w-0 w-full md:w-[380px] xl:w-[420px] flex-shrink-0"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1
            class="text-xl font-bold text-[var(--text)] flex items-center gap-2"
          >
            <MessageSquare class="w-5 h-5 text-[var(--primary)]" />
            {{ t("chatModule.title") }}
            <span
              :class="
                isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              "
              class="inline-block w-2.5 h-2.5 rounded-full ml-1"
              :title="
                isOnline
                  ? t('chatModule.presence.online')
                  : t('chatModule.presence.offline')
              "
            />
            <span
              v-if="waitingCount > 0"
              class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold animate-pulse"
            >
              {{ waitingCount }}
            </span>
          </h1>
          <p class="text-xs text-[var(--text-muted)] mt-0.5">
            {{ conversations.length }} {{ t("chatModule.conversations") }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Button
            :icon="isOnline ? 'pi pi-circle-fill' : 'pi pi-circle'"
            :severity="isOnline ? 'success' : 'secondary'"
            :label="
              isOnline
                ? t('chatModule.presence.goOffline')
                : t('chatModule.presence.goOnline')
            "
            size="small"
            outlined
            @click="togglePresence"
          />
          <Button
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            size="small"
            :loading="isLoading"
            @click="() => refetch()"
          />
        </div>
      </div>

      <!-- Search -->
      <IconField class="mb-3 w-full">
        <InputIcon>
          <i class="pi pi-search text-(--text-muted) text-base" />
        </InputIcon>
        <InputText
          v-model="search"
          :placeholder="t('chatModule.searchPlaceholder')"
          class="w-full text-sm"
        />
      </IconField>

      <!-- Tabs -->
      <div class="flex gap-1 mb-3 border-b border-[var(--border)]">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="px-3 py-1.5 text-sm rounded-t transition-colors relative"
          :class="
            activeTab === tab.value
              ? 'text-[var(--primary)] font-medium border-b-2 border-[var(--primary)] -mb-px'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          "
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span
            v-if="tab.value === 'WAITING' && waitingCount > 0"
            class="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold"
            >{{ waitingCount }}</span
          >
        </button>
      </div>

      <!-- Conversation list -->
      <div
        class="flex-1 overflow-y-auto space-y-0 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      >
        <!-- Loading skeleton -->
        <template v-if="isLoading">
          <div
            v-for="i in 5"
            :key="i"
            class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] animate-pulse"
          >
            <div class="w-9 h-9 rounded-full bg-[var(--border)] shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3 bg-[var(--border)] rounded w-1/2" />
              <div class="h-2.5 bg-[var(--border)] rounded w-3/4" />
            </div>
          </div>
        </template>

        <!-- Empty state -->
        <div
          v-else-if="!conversations.length"
          class="flex flex-col items-center justify-center py-16 text-center px-4"
        >
          <MessageSquare
            class="w-8 h-8 text-[var(--text-muted)] mb-3 opacity-40"
          />
          <p class="text-sm text-[var(--text-muted)]">{{ emptyLabel() }}</p>
        </div>

        <!-- Rows -->
        <div
          v-else
          v-for="conv in conversations"
          :key="conv.id"
          class="group flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors"
          :class="
            selectedConv?.id === conv.id
              ? 'bg-[var(--primary)]/8'
              : 'hover:bg-[var(--surface-raised)]'
          "
          @mouseenter="hoveredId = conv.id"
          @mouseleave="hoveredId = null"
          @click="selectedConv = conv"
        >
          <!-- Avatar -->
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
            :style="{ backgroundColor: avatarColor(conv.visitorName) }"
          >
            {{ avatarInitial(conv.visitorName) }}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span
                class="text-sm truncate"
                :class="
                  (conv.unreadCount ?? 0) > 0
                    ? 'font-bold text-[var(--text)]'
                    : 'font-medium text-[var(--text)]'
                "
              >
                {{ conv.visitorName ?? t("chatModule.visitor") }}
              </span>
              <span class="text-[10px] text-[var(--text-muted)] shrink-0">{{
                timeAgo(conv.createdAt)
              }}</span>
            </div>
            <div class="flex items-center justify-between gap-2 mt-0.5">
              <p
                class="text-xs text-[var(--text-muted)] truncate flex items-center gap-1"
              >
                <span
                  v-if="(conv.unreadCount ?? 0) > 0"
                  class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 inline-block"
                />
                {{ lastMessage(conv) }}
              </p>
              <Tag
                :value="statusLabel(conv.status)"
                :severity="statusSeverity(conv.status)"
                class="text-[9px] shrink-0 !py-0.5 !px-1.5"
              />
            </div>
          </div>

          <!-- Hover actions -->
          <div
            v-if="hoveredId === conv.id"
            class="flex gap-1 shrink-0 items-center"
            @click.stop
          >
            <Button
              v-if="conv.status === 'WAITING'"
              :label="t('chatModule.actions.take')"
              size="small"
              severity="success"
              class="!py-1 !px-2 !text-xs"
              :loading="
                claimMut.isPending.value && claimMut.variables.value === conv.id
              "
              @click="claimMut.mutate(conv.id)"
            />
            <Button
              v-if="conv.status === 'ACTIVE'"
              :label="t('chatModule.actions.close')"
              size="small"
              severity="warning"
              outlined
              class="!py-1 !px-2 !text-xs"
              :loading="
                closeMut.isPending.value && closeMut.variables.value === conv.id
              "
              @click="closeMut.mutate(conv.id)"
            />
            <Button
              v-if="conv.status === 'CLOSED'"
              :label="t('chatModule.actions.archive')"
              size="small"
              severity="secondary"
              outlined
              class="!py-1 !px-2 !text-xs"
              :loading="
                archiveMut.isPending.value &&
                archiveMut.variables.value === conv.id
              "
              @click="archiveMut.mutate(conv.id)"
            />
            <Button
              v-if="conv.status === 'ARCHIVED'"
              :label="t('chatModule.actions.unarchive')"
              size="small"
              severity="secondary"
              outlined
              class="!py-1 !px-2 !text-xs"
              :loading="
                unarchiveMut.isPending.value &&
                unarchiveMut.variables.value === conv.id
              "
              @click="unarchiveMut.mutate(conv.id)"
            />
            <!-- Delete (two-step confirm) — CLOSED or ARCHIVED only -->
            <template v-if="conv.status === 'CLOSED' || conv.status === 'ARCHIVED'">
              <template v-if="confirmDeleteId === conv.id">
                <Button
                  :label="t('chatModule.actions.confirmDelete')"
                  size="small"
                  severity="danger"
                  class="!py-1 !px-2 !text-xs"
                  :loading="deleteMut.isPending.value && deleteMut.variables.value === conv.id"
                  @click.stop="deleteMut.mutate(conv.id); confirmDeleteId = null"
                />
                <Button
                  icon="pi pi-times"
                  size="small"
                  severity="secondary"
                  text
                  class="!p-1"
                  @click.stop="confirmDeleteId = null"
                />
              </template>
              <Button
                v-else
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
                class="!p-1"
                :title="t('chatModule.actions.delete')"
                @click.stop="confirmDeleteId = conv.id"
              />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Right: conversation view -->
    <div class="flex-1 min-w-0 hidden md:flex">
      <Transition name="slide-left">
        <div
          v-if="selectedConv"
          class="w-full border border-[var(--border)] rounded-2xl overflow-hidden shadow-lg flex flex-col"
          style="height: calc(100vh - 140px)"
        >
          <ChatConversationView
            :conversation="selectedConv"
            @close="selectedConv = null"
            @transfer="showTransfer = true"
            @closed="() => { invalidate(); selectedConv = null }"
            @archived="() => { invalidate(); selectedConv = null }"
            @unarchived="() => { invalidate(); selectedConv = null }"
            @deleted="() => { invalidate(); selectedConv = null }"
          />
        </div>
        <div
          v-else
          class="w-full flex flex-col gap-4"
          style="height: calc(100vh - 140px); overflow-y: auto"
        >
          <!-- No conversation selected hint -->
          <div
            class="flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-2xl flex-1 min-h-[200px]"
          >
            <MessageSquare
              class="w-10 h-10 text-[var(--text-muted)] opacity-30 mb-3"
            />
            <p class="text-sm text-[var(--text-muted)]">
              {{ t("chatModule.noConversationSelected") }}
            </p>
          </div>

          <!-- Online Agents Panel -->
          <div
            class="border border-[var(--border)] rounded-2xl p-4 bg-[var(--surface)] shrink-0"
          >
            <div class="flex items-center gap-2 mb-3">
              <span class="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <h3 class="text-sm font-semibold text-[var(--text)]">
                {{ t("chatModule.agents.online") }}
              </h3>
              <span class="ml-auto text-xs text-[var(--text-muted)]">{{
                (onlineAgents ?? []).length
              }}</span>
            </div>
            <div
              v-if="!(onlineAgents ?? []).length"
              class="text-xs text-[var(--text-muted)] text-center py-2"
            >
              {{ t("chatModule.agents.noAgents") }}
            </div>
            <div
              v-for="agent in onlineAgents ?? []"
              :key="agent.agentId"
              class="flex items-center gap-3 py-1.5"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 relative"
                :style="{ backgroundColor: agentColor(agent.name) }"
              >
                {{ agentInitials(agent.name) }}
                <span
                  class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-[var(--text)] truncate">
                  {{ agent.name }}
                </div>
                <div class="text-[10px] text-[var(--text-muted)]">
                  {{
                    agent.activeChats > 0
                      ? t("chatModule.agents.activeChats", {
                          n: agent.activeChats,
                        })
                      : "Disponible"
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>

  <ChatTransferDialog
    v-if="showTransfer && selectedConv"
    :conversation="selectedConv"
    @close="showTransfer = false"
    @transferred="
      () => {
        showTransfer = false;
        invalidate();
      }
    "
  />
</template>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.2s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
