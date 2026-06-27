<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import { useToast } from '@/composables/useToast'
import { mailboxService } from '@/services/mailbox.service'
import type { MailboxConfig, MailboxRequest } from '@/types/mailbox'
import Card from '@/components/ui/Card.vue'
import dayjs from 'dayjs'

const { t } = useI18n()
const toast = useToast()
const qc = useQueryClient()

const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const testing = ref(false)
const testSendVisible = ref(false)
const testSendTo = ref('')
const testSendMailboxId = ref('')
const sendingTest = ref(false)

const form = reactive<MailboxRequest>({
  name: '',
  imapHost: '',
  imapPort: 993,
  imapSsl: true,
  imapUsername: '',
  imapPassword: '',
  imapFolder: 'INBOX',
  smtpHost: '',
  smtpPort: 587,
  smtpSsl: true,
  smtpUsername: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: '',
  pollIntervalSec: 120,
  departmentId: null,
})

const { data: mailboxes, isLoading } = useQuery({
  queryKey: ['mailboxes'],
  queryFn: () => mailboxService.list(),
  staleTime: 30_000,
})

function resetForm() {
  Object.assign(form, {
    name: '', imapHost: '', imapPort: 993, imapSsl: true,
    imapUsername: '', imapPassword: '', imapFolder: 'INBOX',
    smtpHost: '', smtpPort: 587, smtpSsl: true,
    smtpUsername: '', smtpPassword: '',
    fromEmail: '', fromName: '', pollIntervalSec: 120, departmentId: null,
  })
  editingId.value = null
}

function openNew() {
  resetForm()
  showForm.value = true
}

function openEdit(m: MailboxConfig) {
  editingId.value = m.id
  Object.assign(form, {
    name: m.name,
    imapHost: m.imapHost,
    imapPort: m.imapPort,
    imapSsl: m.imapSsl,
    imapUsername: m.imapUsername,
    imapPassword: '***',
    imapFolder: m.imapFolder,
    smtpHost: m.smtpHost,
    smtpPort: m.smtpPort,
    smtpSsl: m.smtpSsl,
    smtpUsername: m.smtpUsername,
    smtpPassword: '***',
    fromEmail: m.fromEmail,
    fromName: m.fromName ?? '',
    pollIntervalSec: m.pollIntervalSec,
    departmentId: m.departmentId,
  })
  showForm.value = true
}

async function save() {
  if (!form.name || !form.imapHost || !form.smtpHost || !form.fromEmail) return
  saving.value = true
  try {
    if (editingId.value) {
      await mailboxService.update(editingId.value, { ...form })
    } else {
      await mailboxService.create({ ...form })
    }
    await qc.invalidateQueries({ queryKey: ['mailboxes'] })
    toast.success(t('mailbox.saved'))
    showForm.value = false
    resetForm()
  } catch {
    toast.error(t('mailbox.saveError'))
  } finally {
    saving.value = false
  }
}

async function deactivate(m: MailboxConfig) {
  try {
    await mailboxService.deactivate(m.id)
    await qc.invalidateQueries({ queryKey: ['mailboxes'] })
    toast.success(t('mailbox.deleted'))
  } catch {
    toast.error(t('mailbox.deleteError'))
  }
}

async function testConnection(m: MailboxConfig) {
  testing.value = true
  try {
    const msg = await mailboxService.testConnection(m.id)
    toast.success(msg || t('mailbox.testSuccess'))
  } catch {
    toast.error(t('mailbox.testFailed'))
  } finally {
    testing.value = false
  }
}

function openTestSend(m: MailboxConfig) {
  testSendMailboxId.value = m.id
  testSendVisible.value = true
}

async function sendTestEmail() {
  if (!testSendTo.value) return
  sendingTest.value = true
  try {
    await mailboxService.testSend(testSendMailboxId.value, testSendTo.value)
    toast.success(t('mailbox.testSendSuccess'))
    testSendVisible.value = false
  } catch {
    toast.error(t('mailbox.testSendFailed'))
  } finally {
    sendingTest.value = false
  }
}

const formTitle = computed(() => editingId.value ? t('mailbox.editMailbox') : t('mailbox.newMailbox'))
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('mailbox.title') }}</h3>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ t('mailbox.subtitle') }}</p>
      </div>
      <Button :label="t('mailbox.addNew')" icon="pi pi-plus" size="small" @click="openNew" />
    </div>

    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 2" :key="i" class="h-20 rounded-lg bg-muted/30 animate-pulse" />
    </div>

    <div v-else-if="!mailboxes?.length" class="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
      <i class="pi pi-envelope text-3xl text-[var(--text-muted)] mb-3" />
      <p class="text-sm font-medium text-[var(--text)]">{{ t('mailbox.noMailboxes') }}</p>
      <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('mailbox.noMailboxesHint') }}</p>
    </div>

    <div v-else class="space-y-3">
      <Card v-for="m in mailboxes" :key="m.id" class="p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <i class="pi pi-envelope text-[var(--text-muted)]" />
              <span class="font-medium text-sm text-[var(--text)]">{{ m.name }}</span>
              <Tag :severity="m.active ? 'success' : 'secondary'"
                   :value="m.active ? t('mailbox.statusActive') : t('mailbox.statusInactive')"
                   class="text-xs" />
            </div>
            <p class="text-xs text-[var(--text-muted)]">
              IMAP: {{ m.imapUsername }}@{{ m.imapHost }}:{{ m.imapPort }}
              &nbsp;|&nbsp;
              SMTP: {{ m.smtpHost }}:{{ m.smtpPort }}
            </p>
            <p class="text-xs text-[var(--text-muted)] mt-0.5">
              {{ t('mailbox.fromEmail') }}: {{ m.fromEmail }}
              <span v-if="m.lastPolledAt">
                &nbsp;·&nbsp;{{ t('mailbox.lastPolled') }}: {{ dayjs(m.lastPolledAt).fromNow() }}
              </span>
            </p>
            <p v-if="m.errorCount > 0" class="text-xs text-red-500 mt-0.5">
              {{ t('mailbox.errorCount', { count: m.errorCount }) }}: {{ m.lastError }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <Button icon="pi pi-wifi" severity="secondary" size="small" outlined
                    :title="t('mailbox.testConnection')" :loading="testing"
                    @click="testConnection(m)" />
            <Button icon="pi pi-send" severity="secondary" size="small" outlined
                    :title="t('mailbox.testSend')"
                    @click="openTestSend(m)" />
            <Button icon="pi pi-pencil" severity="secondary" size="small" outlined
                    @click="openEdit(m)" />
            <Button icon="pi pi-times" severity="danger" size="small" outlined
                    :title="t('mailbox.deactivate')"
                    @click="deactivate(m)" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Mailbox Form Dialog -->
    <Dialog v-model:visible="showForm" :header="formTitle" modal :style="{ width: '680px' }" :closable="!saving">
      <div class="space-y-5 py-2">
        <!-- Name -->
        <div>
          <label class="text-xs font-medium text-[var(--text-muted)] mb-1 block">{{ t('mailbox.name') }}</label>
          <InputText v-model="form.name" :placeholder="t('mailbox.namePlaceholder')" class="w-full" />
        </div>

        <!-- IMAP -->
        <div class="rounded-lg border border-[var(--border)] p-4 space-y-3">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{{ t('mailbox.imapSection') }}</h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.imapHost') }}</label>
              <InputText v-model="form.imapHost" :placeholder="t('mailbox.imapHostPlaceholder')" class="w-full text-sm" />
            </div>
            <div class="flex gap-2 items-end">
              <div class="flex-1">
                <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.imapPort') }}</label>
                <InputNumber v-model="form.imapPort" :use-grouping="false" class="w-full text-sm" input-class="w-full" />
              </div>
              <div class="flex flex-col items-center pb-1">
                <label class="text-xs text-[var(--text-muted)] mb-1">{{ t('mailbox.imapSsl') }}</label>
                <ToggleSwitch v-model="form.imapSsl" />
              </div>
            </div>
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.imapUser') }}</label>
              <InputText v-model="form.imapUsername" :placeholder="t('mailbox.imapUserPlaceholder')" class="w-full text-sm" />
            </div>
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.imapPassword') }}</label>
              <InputText v-model="form.imapPassword" type="password" :placeholder="t('mailbox.imapPasswordPlaceholder')" class="w-full text-sm" />
            </div>
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.imapFolder') }}</label>
              <InputText v-model="form.imapFolder" :placeholder="t('mailbox.imapFolderPlaceholder')" class="w-full text-sm" />
            </div>
          </div>
        </div>

        <!-- SMTP -->
        <div class="rounded-lg border border-[var(--border)] p-4 space-y-3">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{{ t('mailbox.smtpSection') }}</h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.smtpHost') }}</label>
              <InputText v-model="form.smtpHost" :placeholder="t('mailbox.smtpHostPlaceholder')" class="w-full text-sm" />
            </div>
            <div class="flex gap-2 items-end">
              <div class="flex-1">
                <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.smtpPort') }}</label>
                <InputNumber v-model="form.smtpPort" :use-grouping="false" class="w-full text-sm" input-class="w-full" />
              </div>
              <div class="flex flex-col items-center pb-1">
                <label class="text-xs text-[var(--text-muted)] mb-1">{{ t('mailbox.smtpSsl') }}</label>
                <ToggleSwitch v-model="form.smtpSsl" />
              </div>
            </div>
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.smtpUser') }}</label>
              <InputText v-model="form.smtpUsername" :placeholder="t('mailbox.imapUserPlaceholder')" class="w-full text-sm" />
            </div>
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.smtpPassword') }}</label>
              <InputText v-model="form.smtpPassword" type="password" :placeholder="t('mailbox.smtpPasswordPlaceholder')" class="w-full text-sm" />
            </div>
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.fromEmail') }}</label>
              <InputText v-model="form.fromEmail" :placeholder="t('mailbox.fromEmailPlaceholder')" class="w-full text-sm" />
            </div>
            <div>
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.fromName') }}</label>
              <InputText v-model="form.fromName" :placeholder="t('mailbox.fromNamePlaceholder')" class="w-full text-sm" />
            </div>
          </div>
        </div>

        <!-- Poll interval -->
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--text-muted)] shrink-0">{{ t('mailbox.pollInterval') }}</label>
          <InputNumber v-model="form.pollIntervalSec" :use-grouping="false" :min="30" class="w-24 text-sm" input-class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button :label="t('mailbox.cancel')" severity="secondary" outlined @click="showForm = false" />
        <Button :label="t('mailbox.save')" icon="pi pi-check" :loading="saving"
                :disabled="!form.name || !form.imapHost || !form.smtpHost || !form.fromEmail"
                @click="save" />
      </template>
    </Dialog>

    <!-- Test send dialog -->
    <Dialog v-model:visible="testSendVisible" :header="t('mailbox.testSend')" modal :style="{ width: '400px' }">
      <div class="py-2">
        <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.testSendTo') }}</label>
        <InputText v-model="testSendTo" type="email" placeholder="you@example.com" class="w-full" />
      </div>
      <template #footer>
        <Button :label="t('mailbox.cancel')" severity="secondary" outlined @click="testSendVisible = false" />
        <Button :label="t('mailbox.testSend')" icon="pi pi-send" :loading="sendingTest"
                :disabled="!testSendTo" @click="sendTestEmail" />
      </template>
    </Dialog>
  </div>
</template>
