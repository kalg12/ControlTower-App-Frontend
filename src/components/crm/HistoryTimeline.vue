<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { historyService, parseHistoryChange, type HistoryEntry, type HistoryPage } from '@/services/history.service'

const props = defineProps<{
  clientId?: string
  branchId?: string
  opportunityId?: string
  contactId?: string
}>()

const { t } = useI18n()

const history = ref<HistoryEntry[]>([])
const loading = ref(false)
const page = ref(0)
const totalPages = ref(0)
const size = 20

const entityType = computed(() => {
  if (props.clientId) return 'client'
  if (props.branchId) return 'branch'
  if (props.opportunityId) return 'opportunity'
  if (props.contactId) return 'contact'
  return null
})

const actionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    CLIENT_STATUS_CHANGED: t('crm.history.statusChanged'),
    CLIENT_ASSIGNED_USER_CHANGED: t('crm.history.assignedChanged'),
    CLIENT_SEGMENT_CHANGED: t('crm.history.segmentChanged'),
    PROSPECT_CONVERTED: t('crm.history.converted'),
    PROSPECT_LOST: t('crm.history.lost'),
    PROSPECT_REACTIVATED: t('crm.history.reactivated'),
    BRANCH_STATUS_CHANGED: t('crm.history.statusChanged'),
    BRANCH_ASSIGNED_USER_CHANGED: t('crm.history.assignedChanged'),
    OPPORTUNITY_STAGE_CHANGED: t('crm.history.stageChanged'),
    OPPORTUNITY_VALUE_CHANGED: t('crm.history.valueChanged'),
    OPPORTUNITY_ASSIGNED_USER_CHANGED: t('crm.history.assignedChanged'),
    OPPORTUNITY_WON: t('crm.history.won'),
    OPPORTUNITY_LOST: t('crm.history.lost'),
    OPPORTUNITY_REOPENED: t('crm.history.reopened'),
    CONTACT_ASSIGNED_USER_CHANGED: t('crm.history.assignedChanged'),
    CLIENT_CREATED: t('crm.history.created'),
    OPPORTUNITY_CREATED: t('crm.history.created'),
    BRANCH_CREATED: t('crm.history.created'),
    CONTACT_CREATED: t('crm.history.created'),
  }
  return labels[action] || action
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatValue = (val: string | null): string => {
  if (!val) return '-'
  if (typeof val === 'string' && val.match(/^[0-9a-f-]{36}$/)) {
    return 'Usuario cambiado'
  }
  return String(val)
}

const loadHistory = async () => {
  loading.value = true
  try {
    let response
    if (props.clientId) {
      response = await historyService.getClientHistory(props.clientId, page.value, size)
    } else if (props.branchId) {
      response = await historyService.getBranchHistory(props.branchId, page.value, size)
    } else if (props.opportunityId) {
      response = await historyService.getOpportunityHistory(props.opportunityId, page.value, size)
    } else if (props.contactId) {
      response = await historyService.getContactHistory(props.contactId, page.value, size)
    }
    
    if (response?.data) {
      const data: HistoryPage = response.data
      history.value = data.content
      totalPages.value = data.totalPages
    }
  } catch (error) {
    console.error('Failed to load history:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (page.value < totalPages.value - 1) {
    page.value++
    loadHistory()
  }
}

onMounted(() => {
  if (entityType.value) {
    loadHistory()
  }
})
</script>

<template>
  <div class="history-timeline">
    <div v-if="loading" class="history-loading">
      <i class="pi pi-spin pi-spinner"></i>
      {{ t('common.loading') }}
    </div>

    <div v-else-if="history.length === 0" class="history-empty">
      <i class="pi pi-history"></i>
      <p>{{ t('crm.history.noHistory') }}</p>
    </div>

    <div v-else class="timeline">
      <div 
        v-for="entry in history" 
        :key="entry.id" 
        class="timeline-entry"
      >
        <div class="timeline-marker">
          <div class="marker-dot"></div>
          <div class="marker-line"></div>
        </div>
        
        <div class="timeline-content">
          <div class="entry-header">
            <span class="entry-action">{{ actionLabel(entry.action) }}</span>
            <span class="entry-date">{{ formatDate(entry.createdAt) }}</span>
          </div>
          
          <div class="entry-user" v-if="entry.userName">
            <i class="pi pi-user"></i>
            {{ entry.userName }}
          </div>
          
          <div class="entry-changes" v-if="parseHistoryChange(entry)">
            <template v-if="parseHistoryChange(entry)">
              <span class="change-field">{{ parseHistoryChange(entry)?.field }}:</span>
              <span class="change-old">{{ formatValue(parseHistoryChange(entry)?.oldValue ?? null) }}</span>
              <i class="pi pi-arrow-right"></i>
              <span class="change-new">{{ formatValue(parseHistoryChange(entry)?.newValue ?? null) }}</span>
            </template>
          </div>
        </div>
      </div>

      <div v-if="page < totalPages - 1" class="load-more">
        <button @click="loadMore" class="p-button p-button-text">
          {{ t('common.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-timeline {
  padding: 1rem;
}

.history-loading,
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.history-empty i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.timeline {
  position: relative;
}

.timeline-entry {
  display: flex;
  gap: 1rem;
  padding-bottom: 1.5rem;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 20px;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary-color);
  border: 2px solid var(--surface-ground);
  box-shadow: 0 0 0 2px var(--primary-color);
}

.marker-line {
  width: 2px;
  flex: 1;
  background: var(--surface-border);
  margin-top: 0.5rem;
}

.timeline-entry:last-child .marker-line {
  display: none;
}

.timeline-content {
  flex: 1;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.entry-action {
  font-weight: 600;
  color: var(--text-color);
}

.entry-date {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.entry-user {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.5rem;
}

.entry-changes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.change-field {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.change-old {
  color: var(--red-500);
  text-decoration: line-through;
}

.change-new {
  color: var(--green-500);
  font-weight: 500;
}

.load-more {
  text-align: center;
  padding-top: 1rem;
}
</style>
