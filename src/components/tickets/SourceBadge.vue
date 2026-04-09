<script setup lang="ts">
import Tag from 'primevue/tag'
import type { TicketSource } from '@/types/ticket'

defineProps<{ source?: TicketSource }>()

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
    POS: 'POS',
    HEALTH_ALERT: 'Health Alert',
    MANUAL: 'Manual',
    WEBHOOK: 'Webhook',
    EMAIL: 'Email'
  }
  return map[s ?? 'MANUAL'] ?? 'Manual'
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
