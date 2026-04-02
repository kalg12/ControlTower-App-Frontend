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
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import Card from '@/components/ui/Card.vue'
import { integrationsService } from '@/services/integrations.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Integration } from '@/types/integration'
import { Plug, Clock } from 'lucide-vue-next'

dayjs.extend(relativeTime)

const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: ['integrations'],
  queryFn: () => integrationsService.list(),
  staleTime: 30000
})

const list = computed(() => result.value?.content ?? [])

async function toggleActive(integration: Integration) {
  try {
    if (integration.active) {
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

function deleteIntegration(integration: Integration) {
  confirm.require({
    message: `Remove integration endpoint "${integration.pullUrl ?? integration.id}"?`,
    header: 'Remove Integration',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Remove', severity: 'danger' },
    accept: async () => {
      try {
        await integrationsService.delete(integration.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        toast.success('Integration removed')
      } catch {
        toast.error('Failed to remove integration')
      }
    }
  })
}

// --- Create Integration Dialog ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const endpointTypes = [
  { label: 'POS System', value: 'POS' },
  { label: 'Custom', value: 'CUSTOM' }
]

const schema = z.object({
  type: z.enum(['POS', 'CUSTOM']),
  pullUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  apiKey: z.string().optional(),
  heartbeatIntervalSeconds: z.number().int().min(30).max(86400).default(300),
  contractVersion: z.string().optional(),
  clientBranchId: z.string().uuid('Must be a valid UUID').optional().or(z.literal(''))
})

const { handleSubmit, errors, resetForm, defineField } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { type: 'POS', pullUrl: '', apiKey: '', heartbeatIntervalSeconds: 300, contractVersion: '', clientBranchId: '' }
})

const [typeValue, typeAttrs] = defineField('type')
const [pullUrlValue, pullUrlAttrs] = defineField('pullUrl')
const [apiKeyValue, apiKeyAttrs] = defineField('apiKey')
const [heartbeatValue, heartbeatAttrs] = defineField('heartbeatIntervalSeconds')
const [contractValue, contractAttrs] = defineField('contractVersion')
const [branchIdValue, branchIdAttrs] = defineField('clientBranchId')

function openCreateDialog() {
  resetForm()
  showCreateDialog.value = true
}

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await integrationsService.create({
      type: values.type,
      pullUrl: values.pullUrl || undefined,
      apiKey: values.apiKey || undefined,
      heartbeatIntervalSeconds: values.heartbeatIntervalSeconds,
      contractVersion: values.contractVersion || undefined,
      clientBranchId: values.clientBranchId || undefined
    })
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    showCreateDialog.value = false
    toast.success('Integration registered')
  } catch {
    toast.error('Failed to register integration')
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Integrations</h2>
        <p class="text-sm text-[var(--text-muted)]">Registered POS and external system endpoints</p>
      </div>
      <Button label="Register Endpoint" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <!-- Error -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load integrations. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 bg-[var(--surface-raised)] animate-pulse rounded-xl" />
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
        <p class="font-semibold text-[var(--text)]">No integrations registered</p>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">Register a POS or custom system endpoint to start monitoring.</p>
      </div>
      <Button label="Register Endpoint" icon="pi pi-plus" @click="openCreateDialog" />
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
            <Plug class="w-5 h-5 text-[var(--primary)]" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-[var(--text-muted)] font-mono bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">{{ integration.type }}</span>
              <Tag :severity="integration.active ? 'success' : 'secondary'" :value="integration.active ? 'Active' : 'Inactive'" class="text-xs" />
            </div>

            <p v-if="integration.pullUrl" class="text-xs text-[var(--text-muted)] mt-1 truncate font-mono">{{ integration.pullUrl }}</p>
            <p v-else class="text-xs text-[var(--text-muted)] mt-1 italic">No pull URL configured</p>

            <div class="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" />
                Heartbeat every {{ integration.heartbeatIntervalSeconds }}s
              </span>
              <span v-if="integration.contractVersion" class="font-mono">
                v{{ integration.contractVersion }}
              </span>
              <span v-if="integration.clientBranchId" class="font-mono truncate max-w-[140px]">
                Branch: {{ integration.clientBranchId }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <Button
              :icon="integration.active ? 'pi pi-pause' : 'pi pi-play'"
              :severity="integration.active ? 'warn' : 'success'"
              text
              rounded
              v-tooltip.top="integration.active ? 'Deactivate' : 'Activate'"
              @click="toggleActive(integration)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              v-tooltip.top="'Remove'"
              @click="deleteIntegration(integration)"
            />
          </div>
        </div>
      </Card>
    </div>
  </div>

  <!-- Register Integration Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    title="Register Integration Endpoint"
    subtitle="Add a POS or custom system endpoint to start receiving heartbeats and events."
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField label="Type" name="type" :error="errors.type" required>
        <Select
          id="int-type"
          v-model="typeValue"
          v-bind="typeAttrs"
          :options="endpointTypes"
          option-label="label"
          option-value="value"
          placeholder="Select type"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Pull URL" name="pullUrl" :error="errors.pullUrl">
        <InputText
          id="int-url"
          v-model="pullUrlValue"
          v-bind="pullUrlAttrs"
          placeholder="https://pos-system.example.com/api/status"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="API Key (optional)" name="apiKey" :error="errors.apiKey">
        <InputText
          id="int-apikey"
          v-model="apiKeyValue"
          v-bind="apiKeyAttrs"
          placeholder="Secret key for authentication"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Heartbeat Interval (seconds)" name="heartbeatIntervalSeconds" :error="errors.heartbeatIntervalSeconds">
        <InputNumber
          id="int-heartbeat"
          v-model="heartbeatValue"
          v-bind="heartbeatAttrs"
          :min="30"
          :max="86400"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Contract Version (optional)" name="contractVersion" :error="errors.contractVersion">
        <InputText
          id="int-contract"
          v-model="contractValue"
          v-bind="contractAttrs"
          placeholder="e.g. 1.0"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Branch ID (optional)" name="clientBranchId" :error="errors.clientBranchId">
        <InputText
          id="int-branch"
          v-model="branchIdValue"
          v-bind="branchIdAttrs"
          placeholder="UUID of the associated branch"
          class="w-full font-mono"
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
          label="Register"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>
</template>
