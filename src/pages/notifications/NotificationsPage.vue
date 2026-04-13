<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import { notificationsService } from '@/services/notifications.service'
import { useNotificationsStore } from '@/stores/notifications'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Bell } from 'lucide-vue-next'

import Button from 'primevue/button'
import Paginator from 'primevue/paginator'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
dayjs.locale(locale.value === 'es' ? 'es' : 'en')

const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()
const notifStore = useNotificationsStore()

const filter = ref<'ALL' | 'UNREAD'>('ALL')
const page = ref(0)
const pageSize = 20

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['notifications-list', page.value, filter.value]),
  queryFn: () => notificationsService.list({
    page: page.value,
    size: pageSize,
    
  }),
  staleTime: 10000,
})

const notifications = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function fromNow(dateStr: string) {
  return dayjs(dateStr).fromNow()
}

function typeIcon(type: string) {
  const map: Record<string, string> = {
    HEALTH_INCIDENT: 'pi pi-heart',
    TICKET_CREATED: 'pi pi-ticket',
    TICKET_UPDATED: 'pi pi-pencil',
    LICENSE_EXPIRED: 'pi pi-credit-card',
    SYSTEM: 'pi pi-info-circle',
  }
  return map[type] || 'pi pi-bell'
}

async function markAllRead() {
  try {
    await notifStore.markAllRead()
    toast.success(t('notifications.markAllSuccess'))
  } catch {
    toast.error(t('notifications.markAllFailed'))
  }
}

function confirmClearAll() {
  confirm.require({
    message: t('notifications.clearAllConfirm'),
    header: t('notifications.clearAllTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await notifStore.markAllRead()
        await queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
        toast.success(t('notifications.clearAllSuccess'))
      } catch {
        toast.error(t('notifications.clearAllFailed'))
      }
    }
  })
}

function confirmDelete(id: string) {
  confirm.require({
    message: t('notifications.deleteConfirm'),
    header: t('notifications.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await notifStore.remove(id)
        await queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
        toast.success(t('notifications.deleteSuccess'))
      } catch {
        toast.error(t('notifications.deleteFailed'))
      }
    }
  })
}

function onPage(event: { page: number }) {
  page.value = event.page
}
</script>

<template>
  <div class="space-y-4">
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
        <Button :label="t('notifications.clearAll')" size="small" severity="danger" text @click="confirmClearAll()" />
      </div>
    </div>

    <div class="flex gap-2">
      <Button v-for="opt in [{ label: t('notifications.filterAll'), value: 'ALL' }, { label: t('notifications.filterUnread'), value: 'UNREAD' }]"
        :key="opt.value" :label="opt.label" :severity="filter === opt.value ? '' : 'secondary'" :outlined="filter !== opt.value" size="small"
        @click="filter = opt.value as any" />
    </div>

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('notifications.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <div v-if="!isLoading && notifications.length === 0" class="text-center py-16">
      <Bell class="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-[var(--text)]">{{ t('notifications.noRows') }}</h3>
      <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('notifications.noRowsDesc') }}</p>
    </div>

    <div v-else class="space-y-2">
      <div v-for="n in notifications" :key="n.id"
        class="flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors"
        :class="n.read ? 'border-[var(--border)] bg-[var(--surface)]' : 'border-[var(--primary)]/30 bg-[var(--primary)]/5'">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          :class="n.read ? 'bg-[var(--surface-raised)]' : 'bg-[var(--primary)]/20'">
          <i :class="[typeIcon(n.type), 'text-sm', n.read ? 'text-[var(--text-muted)]' : 'text-[var(--primary)]']" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[var(--text)]">{{ n.title }}</p>
          <p class="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{{ n.body }}</p>
          <p class="text-xs text-[var(--text-muted)] mt-1">{{ fromNow(n.createdAt) }}</p>
        </div>
        <Button icon="pi pi-times" severity="secondary" text rounded size="small" @click="confirmDelete(n.id)" />
      </div>
    </div>

    <Paginator v-if="totalRecords > pageSize" :rows="pageSize" :total-records="totalRecords" :page="page" @page="onPage" class="rounded-xl mt-2" />
  </div>
</template>
