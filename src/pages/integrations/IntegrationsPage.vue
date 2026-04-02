<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import Card from '@/components/ui/Card.vue'
import { integrationsService } from '@/services/integrations.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Integration, IntegrationStatus } from '@/types/integration'
import { Plug, Webhook, RefreshCw, Zap } from 'lucide-vue-next'

dayjs.extend(relativeTime)

const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const { data: integrations, isLoading } = useQuery({
  queryKey: ['integrations'],
  queryFn: () => integrationsService.list(),
  staleTime: 30000
})

const list = computed(() => integrations.value ?? [])

function statusSeverity(status: IntegrationStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  if (status === 'ACTIVE') return 'success'
  if (status === 'ERROR') return 'danger'
  if (status === 'PENDING') return 'warn'
  return 'secondary'
}

async function toggleStatus(integration: Integration) {
  try {
    if (integration.status === 'ACTIVE') {
      await integrationsService.deactivate(integration.id)
      toast.success('Integration deactivated')
    } else {
      await integrationsService.activate(integration.id)
      toast.success('Integration activated')
    }
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
  } catch {
    toast.error('Failed to update integration status')
  }
}

async function testWebhook(integration: Integration) {
  try {
    await integrationsService.testWebhook(integration.id)
    toast.success('Test event sent', 'Check your webhook endpoint for the test payload.')
  } catch {
    toast.error('Test failed', 'Could not deliver test event.')
  }
}

function deleteIntegration(integration: Integration) {
  confirm.require({
    message: `Delete integration "${integration.name}"?`,
    header: 'Delete Integration',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await integrationsService.delete(integration.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        toast.success('Integration deleted')
      } catch {
        toast.error('Failed to delete integration')
      }
    }
  })
}

// --- Create Integration Dialog ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const integrationTypes = [
  { label: 'Webhook', value: 'WEBHOOK' },
  { label: 'Slack', value: 'SLACK' },
  { label: 'Microsoft Teams', value: 'TEAMS' },
  { label: 'PagerDuty', value: 'PAGERDUTY' },
  { label: 'Discord', value: 'DISCORD' },
  { label: 'Custom', value: 'CUSTOM' }
]

const schema = z.object({
  name: z.string().min(2, 'Min 2 characters').max(100),
  type: z.string().min(2, 'Required'),
  webhookUrl: z.string().url('Must be a valid URL'),
  secret: z.string().optional()
})

const { handleSubmit, errors, resetForm, defineField } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { name: '', type: 'WEBHOOK', webhookUrl: '', secret: '' }
})

const [nameValue, nameAttrs] = defineField('name')
const [typeValue, typeAttrs] = defineField('type')
const [webhookUrlValue, webhookUrlAttrs] = defineField('webhookUrl')
const [secretValue, secretAttrs] = defineField('secret')

function openCreateDialog() {
  resetForm()
  showCreateDialog.value = true
}

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await integrationsService.create({
      name: values.name,
      type: values.type,
      webhookUrl: values.webhookUrl,
      secret: values.secret || undefined
    })
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    showCreateDialog.value = false
    toast.success('Integration created')
  } catch {
    toast.error('Failed to create integration')
  } finally {
    isSubmitting.value = false
  }
})

function formatLastTriggered(dateStr?: string) {
  if (!dateStr) return 'Never'
  return dayjs(dateStr).fromNow()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Integrations</h2>
        <p class="text-sm text-[var(--text-muted)]">Connect external services via webhooks</p>
      </div>
      <Button label="New Integration" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="h-24 bg-[var(--surface-raised)] animate-pulse rounded-xl"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="list.length === 0"
      class="flex flex-col items-center justify-center py-16 gap-4 text-center"
    >
      <div class="w-14 h-14 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center">
        <Plug class="w-7 h-7 text-[var(--text-muted)]" />
      </div>
      <div>
        <p class="font-semibold text-[var(--text)]">No integrations yet</p>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">Add a webhook to receive real-time events from Control Tower.</p>
      </div>
      <Button label="Add Integration" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <!-- Integration cards -->
    <div v-else class="space-y-3">
      <Card
        v-for="integration in list"
        :key="integration.id"
        class="hover:border-[var(--primary)]/30 transition-colors"
      >
        <div class="flex items-start gap-4">
          <!-- Icon -->
          <div class="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <Webhook class="w-5 h-5 text-[var(--primary)]" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-[var(--text)]">{{ integration.name }}</p>
              <Tag :severity="statusSeverity(integration.status)" :value="integration.status" class="text-xs" />
              <span class="text-xs text-[var(--text-muted)] font-mono bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">{{ integration.type }}</span>
            </div>

            <p class="text-xs text-[var(--text-muted)] mt-1 truncate font-mono">{{ integration.webhookUrl }}</p>

            <div class="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
              <span class="flex items-center gap-1">
                <Zap class="w-3 h-3" />
                {{ integration.eventsDelivered ?? 0 }} delivered
              </span>
              <span v-if="(integration.eventsFailed ?? 0) > 0" class="text-red-500">
                {{ integration.eventsFailed }} failed
              </span>
              <span class="flex items-center gap-1">
                <RefreshCw class="w-3 h-3" />
                Last: {{ formatLastTriggered(integration.lastTriggeredAt) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <Button
              :icon="integration.status === 'ACTIVE' ? 'pi pi-pause' : 'pi pi-play'"
              :severity="integration.status === 'ACTIVE' ? 'warn' : 'success'"
              text
              rounded
              v-tooltip.top="integration.status === 'ACTIVE' ? 'Deactivate' : 'Activate'"
              @click="toggleStatus(integration)"
            />
            <Button
              icon="pi pi-send"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Send test event'"
              :disabled="integration.status !== 'ACTIVE'"
              @click="testWebhook(integration)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              v-tooltip.top="'Delete'"
              @click="deleteIntegration(integration)"
            />
          </div>
        </div>
      </Card>
    </div>
  </div>

  <!-- Create Integration Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    title="New Integration"
    subtitle="Add a webhook endpoint to receive Control Tower events."
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField label="Name" name="name" :error="errors.name" required>
        <InputText
          id="int-name"
          v-model="nameValue"
          v-bind="nameAttrs"
          placeholder="My Webhook"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Type" name="type" :error="errors.type" required>
        <Select
          id="int-type"
          v-model="typeValue"
          v-bind="typeAttrs"
          :options="integrationTypes"
          option-label="label"
          option-value="value"
          placeholder="Select type"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Webhook URL" name="webhookUrl" :error="errors.webhookUrl" required>
        <InputText
          id="int-url"
          v-model="webhookUrlValue"
          v-bind="webhookUrlAttrs"
          placeholder="https://your-service.com/webhook"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Secret (optional)" name="secret" :error="errors.secret">
        <InputText
          id="int-secret"
          v-model="secretValue"
          v-bind="secretAttrs"
          placeholder="HMAC signing secret"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isSubmitting"
          @click="showCreateDialog = false"
        />
        <Button
          label="Create Integration"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>
</template>
