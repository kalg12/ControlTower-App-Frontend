<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import { notificationsService } from '@/services/notifications.service'
import { useNotificationsStore } from '@/stores/notifications'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { Bell, Ticket, Layout, DollarSign, Settings } from 'lucide-vue-next'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'
import type { NotificationCategory } from '@/types/notification'
import { getCategory, getEntityLink } from '@/types/notification'
import type { Notification } from '@/types/notification'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()
const notifStore = useNotificationsStore()

dayjs.locale(locale.value === 'es' ? 'es' : 'en')

const activeCategory = ref<NotificationCategory>('ALL')
const onlyUnread = ref(false)
const page = ref(0)
const pageSize = 20

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['notifications-list', page.value, onlyUnread.value]),
  queryFn: () => notificationsService.list({
    page: page.value,
    size: pageSize,
    unread: onlyUnread.value ? true : undefined,
  }),
  staleTime: 10_000,
})

const allNotifications = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

const filteredNotifications = computed(() => {
  if (activeCategory.value === 'ALL') return allNotifications.value
  return allNotifications.value.filter(n => getCategory(n.type) === activeCategory.value)
})

type CategoryDef = { key: NotificationCategory; label: string; icon: any }
const categories: CategoryDef[] = [
  { key: 'ALL',     label: t('notifications.categories.all'),     icon: Bell },
  { key: 'TICKETS', label: t('notifications.categories.tickets'), icon: Ticket },
  { key: 'KANBAN',  label: t('notifications.categories.kanban'),  icon: Layout },
  { key: 'FINANCE', label: t('notifications.categories.finance'), icon: DollarSign },
  { key: 'SYSTEM',  label: t('notifications.categories.system'),  icon: Settings },
]

function severityBorder(sev: string) {
  if (sev === 'CRITICAL' || sev === 'ERROR') return 'border-l-4 border-l-red-500'
  if (sev === 'WARNING') return 'border-l-4 border-l-orange-400'
  return 'border-l-4 border-l-blue-400'
}

function severityDot(sev: string) {
  if (sev === 'CRITICAL' || sev === 'ERROR') return 'bg-red-500'
  if (sev === 'WARNING') return 'bg-orange-400'
  return 'bg-blue-400'
}

function typeIcon(type: string) {
  const map: Record<string, string> = {
    TICKET_ASSIGNED: 'pi pi-user',
    TICKET_ESCALATED: 'pi pi-arrow-up',
    TICKET_SLA_BREACHED: 'pi pi-exclamation-circle',
    TICKET_STATUS_CHANGED: 'pi pi-refresh',
    SLA_WARNING: 'pi pi-clock',
    CSAT_RESPONSE_RECEIVED: 'pi pi-star',
    CSAT_LOW_SCORE: 'pi pi-star-fill',
    CARD_DUE_SOON: 'pi pi-calendar',
    CARD_OVERDUE: 'pi pi-calendar-times',
    ESTIMATE_EXCEEDED: 'pi pi-stopwatch',
    INVOICE_DUE_SOON: 'pi pi-credit-card',
    INVOICE_OVERDUE: 'pi pi-credit-card',
    HEALTH_INCIDENT: 'pi pi-heart',
    LICENSE_EXPIRING_SOON: 'pi pi-key',
    POS_TICKET: 'pi pi-shopping-cart',
    POS_CHAT: 'pi pi-comments',
    CALENDAR_ASSIGNED: 'pi pi-calendar-plus',
    CALENDAR_UPDATED: 'pi pi-calendar',
    CALENDAR_REMOVED: 'pi pi-calendar-minus',
  }
  return map[type] || 'pi pi-bell'
}

function fromNow(dateStr: string) {
  return dayjs(dateStr).fromNow()
}

async function doMarkRead(n: Notification) {
  if (n.read) return
  await notifStore.markRead(n.id)
  queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
}

async function markAllRead() {
  try {
    await notifStore.markAllRead()
    await queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
    toast.success(t('notifications.markAllSuccess'))
  } catch {
    toast.error(t('notifications.markAllFailed'))
  }
}

async function openEntity(n: Notification) {
  await doMarkRead(n)
  const link = getEntityLink(n)
  if (link) router.push(link)
}

function handleNotificationClick(n: Notification) {
  const link = getEntityLink(n)
  if (link) {
    openEntity(n)
  } else {
    doMarkRead(n)
  }
}

function confirmDelete(id: string) {
  confirm.require({
    message: t('notifications.deleteConfirm'),
    header: t('notifications.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      await notifStore.remove(id)
      await queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
      notifStore.fetch()
    }
  })
}

function onPage(event: { page: number }) {
  page.value = event.page
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('notifications.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">
          {{ notifStore.unreadCount > 0 ? t('notifications.unreadCount', { count: notifStore.unreadCount }) : t('notifications.allCaughtUp') }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button :label="t('notifications.markAllRead')" size="small" severity="secondary" outlined @click="markAllRead()" />
      </div>
    </div>

    <div class="flex gap-4">
      <!-- Category sidebar -->
      <div class="w-44 flex-shrink-0 space-y-1">
        <button
          v-for="cat in categories"
          :key="cat.key"
          @click="activeCategory = cat.key; page = 0"
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeCategory === cat.key
            ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'"
        >
          <div class="flex items-center gap-2">
            <component :is="cat.icon" class="w-4 h-4" />
            {{ cat.label }}
          </div>
          <span
            v-if="notifStore.unreadByCategory[cat.key] > 0"
            class="min-w-[20px] h-5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center"
          >
            {{ notifStore.unreadByCategory[cat.key] > 9 ? '9+' : notifStore.unreadByCategory[cat.key] }}
          </span>
        </button>

        <div class="pt-2 border-t border-[var(--border)]">
          <button
            @click="onlyUnread = !onlyUnread; page = 0"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="onlyUnread
              ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)]'"
          >
            <i class="pi pi-filter text-xs" />
            {{ t('notifications.filterUnread') }}
          </button>
        </div>
      </div>

      <!-- Notification list -->
      <div class="flex-1 min-w-0 space-y-2">
        <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600">
          {{ t('notifications.loadFailed') }}
          <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
        </div>

        <div v-if="!isLoading && filteredNotifications.length === 0" class="text-center py-16">
          <Bell class="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p class="text-sm text-[var(--text-muted)]">{{ t('notifications.noRows') }}</p>
        </div>

        <div
          v-for="n in filteredNotifications"
          :key="n.id"
          class="flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer hover:bg-[var(--surface-raised)]"
          :class="[
            n.read ? 'border-[var(--border)] bg-[var(--surface)]' : 'border-[var(--primary)]/20 bg-[var(--primary)]/5',
            severityBorder(n.severity)
          ]"
          @click="handleNotificationClick(n)"
        >
          <!-- Severity dot + type icon -->
          <div class="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
            <div :class="['w-2 h-2 rounded-full', severityDot(n.severity)]" />
            <i :class="[typeIcon(n.type), 'text-sm text-[var(--text-muted)]']" />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--text)]">{{ n.title }}</p>
            <p class="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{{ n.body }}</p>
            <p class="text-xs text-[var(--text-muted)] mt-1">{{ fromNow(n.createdAt) }}</p>
          </div>

          <div class="flex items-center gap-1 flex-shrink-0">
            <Button
              v-if="getEntityLink(n)"
              icon="pi pi-arrow-right"
              severity="secondary"
              text rounded size="small"
              :title="t('notifications.open')"
              @click.stop="openEntity(n)"
            />
            <Button icon="pi pi-times" severity="secondary" text rounded size="small" @click.stop="confirmDelete(n.id)" />
          </div>
        </div>

        <Paginator
          v-if="totalRecords > pageSize && activeCategory === 'ALL'"
          :rows="pageSize"
          :total-records="totalRecords"
          :page="page"
          @page="onPage"
          class="rounded-xl mt-2"
        />
      </div>
    </div>
  </div>
</template>
