<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { integrationsService } from '@/services/integrations.service'
import { useToast } from '@/composables/useToast'
import type { Integration } from '@/types/integration'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: ['integrations'],
  queryFn: () => integrationsService.list(0, 200),
  staleTime: 30000,
})

const integrations = computed(() => result.value?.content ?? [])

function confirmToggle(ep: Integration) {
  const activating = !ep.active
  confirm.require({
    message: activating ? t('integrations.activateConfirm', { name: ep.pullUrl || ep.id }) : t('integrations.deactivateConfirm', { name: ep.pullUrl || ep.id }),
    header: activating ? t('integrations.activateTitle') : t('integrations.deactivateTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: activating ? t('common.activate') : t('common.deactivate'), severity: activating ? 'success' : 'warn' },
    accept: async () => {
      try {
        if (ep.active) await integrationsService.deactivate(ep.id)
        else await integrationsService.activate(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        toast.success(activating ? t('integrations.activateSuccess') : t('integrations.deactivateSuccess'))
      } catch {
        toast.error(t('integrations.updateFailed'))
      }
    }
  })
}

function confirmDelete(ep: Integration) {
  confirm.require({
    message: t('integrations.removeConfirm'),
    header: t('integrations.removeTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await integrationsService.delete(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        toast.success(t('integrations.removeSuccess'))
      } catch {
        toast.error(t('integrations.removeFailed'))
      }
    }
  })
}

// --- Register Dialog ---
const showRegisterDialog = ref(false)
const isSubmitting = ref(false)

const registerSchema = z.object({
  type: z.string().min(1),
  pullUrl: z.string().url(t('integrations.validUrl')),
  apiKey: z.string().optional(),
  heartbeatIntervalSeconds: z.number().int().min(30).max(86400).default(300),
  contractVersion: z.string().optional(),
  clientBranchId: z.string().optional(),
})

const registerForm = useForm({
  validationSchema: toTypedSchema(registerSchema),
  initialValues: { type: 'POS', pullUrl: '', apiKey: '', heartbeatIntervalSeconds: 300, contractVersion: '', clientBranchId: '' },
})

const [regType] = registerForm.defineField('type')
const [regUrl, regUrlAttrs] = registerForm.defineField('pullUrl')
const [regKey, regKeyAttrs] = registerForm.defineField('apiKey')
const [regInterval] = registerForm.defineField('heartbeatIntervalSeconds')

const typeOptions = computed(() => [
  { label: t('integrations.posSystem'), value: 'POS' },
  { label: t('integrations.custom'), value: 'CUSTOM' },
])

function openRegisterDialog() {
  registerForm.resetForm()
  showRegisterDialog.value = true
}

const onRegisterSubmit = registerForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await integrationsService.create({
      type: values.type as any,
      pullUrl: values.pullUrl,
      apiKey: values.apiKey || undefined,
      heartbeatIntervalSeconds: values.heartbeatIntervalSeconds,
      contractVersion: values.contractVersion || undefined,
      clientBranchId: values.clientBranchId || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    showRegisterDialog.value = false
    toast.success(t('integrations.registerSuccess'))
  } catch {
    toast.error(t('integrations.registerFailed'))
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('integrations.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('integrations.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button :label="t('integrations.registerEndpoint')" icon="pi pi-plus" @click="openRegisterDialog" />
      </div>
    </div>

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('integrations.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-else-if="isLoading" :rows="3" :cols="5" />

    <DataTable v-else :value="integrations" striped-rows class="rounded-xl overflow-hidden">
      <Column field="type" :header="t('integrations.type')" style="width: 100px">
        <template #body="{ data: row }: { data: Integration }">
          <Tag :value="row.type" severity="info" />
        </template>
      </Column>
      <Column field="pullUrl" :header="t('integrations.pullUrl')" style="min-width: 240px">
        <template #body="{ data: row }: { data: Integration }">
          <span v-if="row.pullUrl" class="text-xs text-[var(--text-muted)] font-mono truncate block max-w-xs" :title="row.pullUrl">{{ row.pullUrl }}</span>
          <span v-else class="text-xs text-red-400">{{ t('integrations.noPullUrl') }}</span>
        </template>
      </Column>
      <Column field="heartbeatIntervalSeconds" :header="t('integrations.interval')" style="width: 100px">
        <template #body="{ data: row }: { data: Integration }">
          <span class="text-sm text-[var(--text-muted)]">{{ t('integrations.heartbeatEvery', { interval: row.heartbeatIntervalSeconds }) }}</span>
        </template>
      </Column>
      <Column field="active" :header="t('integrations.status')" style="width: 100px">
        <template #body="{ data: row }: { data: Integration }">
          <Tag :severity="row.active ? 'success' : 'secondary'" :value="row.active ? t('health.active') : t('health.inactive')" />
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 130px">
        <template #body="{ data: row }: { data: Integration }">
          <div class="flex gap-1">
            <Button :icon="row.active ? 'pi pi-pause' : 'pi pi-play'" :severity="row.active ? 'warn' : 'success'" text rounded size="small" v-tooltip.top="row.active ? t('integrations.deactivate') : t('integrations.activate')" @click="confirmToggle(row)" />
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" v-tooltip.top="t('integrations.remove')" @click="confirmDelete(row)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-10">
          <p class="text-sm font-medium text-[var(--text)]">{{ t('integrations.noRows') }}</p>
          <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('integrations.noRowsHint') }}</p>
        </div>
      </template>
    </DataTable>
  </div>

  <!-- Register Dialog -->
  <AppDialog v-model:visible="showRegisterDialog" :title="t('integrations.registerTitle')" :subtitle="t('integrations.registerSubtitle')" :loading="isSubmitting">
    <form class="flex flex-col gap-4" @submit.prevent="onRegisterSubmit">
      <FormField :label="t('integrations.type')" name="reg-type" :error="registerForm.errors.value.type" required>
        <Select v-model="regType" :options="typeOptions" option-label="label" option-value="value" :placeholder="t('integrations.selectType')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('integrations.pullUrl')" name="reg-url" :error="registerForm.errors.value.pullUrl" required>
        <InputText v-model="regUrl" v-bind="regUrlAttrs" placeholder="https://pos-system.example.com/api/status" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('integrations.apiKey')" name="reg-key" :error="registerForm.errors.value.apiKey">
        <InputText v-model="regKey" v-bind="regKeyAttrs" type="password" :placeholder="t('integrations.apiKeyHint')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('integrations.interval')" name="reg-interval" :error="registerForm.errors.value.heartbeatIntervalSeconds">
        <InputNumber v-model="regInterval" :min="30" :max="86400" class="w-full" :disabled="isSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmitting" @click="showRegisterDialog = false" />
        <Button :label="t('integrations.register')" :loading="isSubmitting" @click="onRegisterSubmit" />
      </div>
    </template>
  </AppDialog>
</template>
