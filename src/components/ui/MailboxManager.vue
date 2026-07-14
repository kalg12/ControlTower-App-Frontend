<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from '@/composables/useToast'
import { emailService } from '@/services/email.service'
import Card from '@/components/ui/Card.vue'

const { t } = useI18n()
const toast = useToast()

const sendingTest = ref(false)

const { data: status, isLoading } = useQuery({
  queryKey: ['email-status'],
  queryFn: () => emailService.getStatus(),
  staleTime: 30_000,
})

async function sendTest() {
  sendingTest.value = true
  try {
    await emailService.sendTest()
    toast.success(t('mailbox.testSendSuccess'))
  } catch {
    toast.error(t('mailbox.testSendFailed'))
  } finally {
    sendingTest.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('mailbox.title') }}</h3>
      <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ t('mailbox.subtitle') }}</p>
    </div>

    <div v-if="isLoading" class="h-24 rounded-lg bg-muted/30 animate-pulse" />

    <Card v-else class="p-4">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <i class="pi pi-envelope text-[var(--text-muted)]" />
            <span class="font-medium text-sm text-[var(--text)]">Resend</span>
            <Tag :severity="status?.configured ? 'success' : 'danger'"
                 :value="status?.configured ? t('mailbox.statusActive') : t('mailbox.statusInactive')"
                 class="text-xs" />
          </div>
          <p class="text-xs text-[var(--text-muted)]">
            {{ t('mailbox.fromEmail') }}: {{ status?.fromName }} &lt;{{ status?.fromEmail }}&gt;
          </p>
          <p v-if="!status?.configured" class="text-xs text-amber-500 mt-1">
            {{ t('mailbox.resendNotConfigured') }}
          </p>
        </div>
        <Button :label="t('mailbox.testSend')" icon="pi pi-send" size="small" outlined
                :loading="sendingTest" :disabled="!status?.configured" @click="sendTest" />
      </div>
    </Card>
  </div>
</template>
