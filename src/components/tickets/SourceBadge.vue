<script setup lang="ts">
import Tag from 'primevue/tag'
import { useI18n } from 'vue-i18n'
import type { TicketSource } from '@/types/ticket'

defineProps<{ source?: TicketSource }>()
const { t } = useI18n()

function severity(s?: TicketSource): string {
  const map: Record<string, string> = {
    POS: 'warn',
    HEALTH_ALERT: 'danger',
    MANUAL: 'secondary',
    WEBHOOK: 'info',
    EMAIL: 'info'
  }
  return map[s ?? 'MANUAL'] ?? 'secondary'
}

function label(s?: TicketSource): string {
  const map: Record<string, string> = {
    POS: t('sourceBadge.pos'),
    HEALTH_ALERT: t('sourceBadge.healthAlert'),
    MANUAL: t('sourceBadge.manual'),
    WEBHOOK: t('sourceBadge.webhook'),
    EMAIL: t('sourceBadge.email')
  }
  return map[s ?? 'MANUAL'] ?? t('sourceBadge.manual')
}

function icon(s?: TicketSource): string {
  const map: Record<string, string> = {
    POS: 'pi pi-shopping-cart',
    HEALTH_ALERT: 'pi pi-heart',
    MANUAL: 'pi pi-user',
    WEBHOOK: 'pi pi-link',
    EMAIL: 'pi pi-envelope'
  }
  return map[s ?? 'MANUAL'] ?? 'pi pi-tag'
}
</script>

<template>
  <Tag :severity="severity(source)" :value="label(source)" :icon="icon(source)" />
</template>
