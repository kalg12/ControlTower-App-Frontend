<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import { useToast } from '@/composables/useToast'
import { mailboxService } from '@/services/mailbox.service'
import type { MailboxConfig, MailboxRequest, DeliverabilityReport } from '@/types/mailbox'
import Card from '@/components/ui/Card.vue'
import dayjs from 'dayjs'

const { t } = useI18n()
const toast = useToast()
const qc = useQueryClient()

const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formDirty = ref(false)
const testing = ref(false)
const testSendVisible = ref(false)
const testSendTo = ref('')
const testSendMailboxId = ref('')
const sendingTest = ref(false)
const diagVisible = ref(false)
const diagLoading = ref(false)
const diagReport = ref<DeliverabilityReport | null>(null)
const diagMailboxId = ref('')

const BLANK_FORM: MailboxRequest = {
  name: '', imapHost: '', imapPort: 993, imapSsl: true,
  imapUsername: '', imapPassword: '', imapFolder: 'INBOX',
  smtpHost: '', smtpPort: 587, smtpSsl: true,
  smtpUsername: '', smtpPassword: '',
  fromEmail: '', fromName: '', pollIntervalSec: 120, departmentId: null,
  dkimSelector: '', dkimPrivateKey: '',
}

const form = reactive<MailboxRequest>({ ...BLANK_FORM })

const { data: mailboxes, isLoading } = useQuery({
  queryKey: ['mailboxes'],
  queryFn: () => mailboxService.list(),
  staleTime: 30_000,
  retry: false,
})

function resetForm() {
  Object.assign(form, BLANK_FORM)
  editingId.value = null
  formDirty.value = false
}

function openNew() {
  resetForm()
  showForm.value = true
  const stop = watch(form, () => { formDirty.value = true; stop() }, { deep: true })
}

function openEdit(m: MailboxConfig) {
  editingId.value = m.id
  Object.assign(form, {
    name: m.name,
    imapHost: m.imapHost, imapPort: m.imapPort, imapSsl: m.imapSsl,
    imapUsername: m.imapUsername, imapPassword: '***', imapFolder: m.imapFolder,
    smtpHost: m.smtpHost, smtpPort: m.smtpPort, smtpSsl: m.smtpSsl,
    smtpUsername: m.smtpUsername, smtpPassword: '***',
    fromEmail: m.fromEmail, fromName: m.fromName ?? '',
    pollIntervalSec: m.pollIntervalSec, departmentId: m.departmentId,
    dkimSelector: m.dkimSelector ?? '',
    dkimPrivateKey: m.dkimConfigured ? '***' : '',
  })
  formDirty.value = false
  showForm.value = true
  const stop = watch(form, () => { formDirty.value = true; stop() }, { deep: true })
}

function requestCloseForm() {
  if (formDirty.value && !saving.value) {
    if (!confirm(t('mailbox.unsavedChanges'))) return
  }
  showForm.value = false
  resetForm()
}

async function save() {
  if (!form.name || !form.imapHost || !form.smtpHost || !form.fromEmail) {
    toast.error(t('mailbox.saveValidation'))
    return
  }
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

function mapSmtpError(backendMsg: string): string {
  if (backendMsg.includes('SMTP_AUTH_FAILED'))       return t('mailbox.smtpErrors.authFailed')
  if (backendMsg.includes('SMTP_CONNECTION_FAILED')) return t('mailbox.smtpErrors.connectionFailed')
  if (backendMsg.includes('SMTP_TIMEOUT'))           return t('mailbox.smtpErrors.timeout')
  if (backendMsg.includes('SMTP_TLS_FAILED'))        return t('mailbox.smtpErrors.tlsFailed')
  if (backendMsg.includes('SMTP_RECIPIENT_REJECTED'))return t('mailbox.smtpErrors.recipientRejected')
  if (backendMsg.includes('SMTP_SENDER_REJECTED'))   return t('mailbox.smtpErrors.senderRejected')
  if (backendMsg.includes('SMTP_RATE_LIMITED'))      return t('mailbox.smtpErrors.rateLimited')
  if (backendMsg.includes('SMTP_ACCOUNT_LOCKED'))    return t('mailbox.smtpErrors.accountLocked')
  if (backendMsg.includes('SMTP_CONFIG_ERROR'))      return t('mailbox.smtpErrors.configError')
  return t('mailbox.testSendFailed')
}

async function sendTestEmail() {
  if (!testSendTo.value) return
  sendingTest.value = true
  try {
    await mailboxService.testSend(testSendMailboxId.value, testSendTo.value)
    toast.success(t('mailbox.testSendSuccess'))
    testSendVisible.value = false
  } catch (err: unknown) {
    const data = (err as any)?.response?.data
    const backendMsg: string = data?.message ?? ''
    toast.error(mapSmtpError(backendMsg))
  } finally {
    sendingTest.value = false
  }
}

async function openDeliverability(m: MailboxConfig) {
  diagMailboxId.value = m.id
  diagReport.value = null
  diagVisible.value = true
  diagLoading.value = true
  try {
    diagReport.value = await mailboxService.checkDeliverability(m.id)
  } catch {
    toast.error(t('mailbox.diagError'))
    diagVisible.value = false
  } finally {
    diagLoading.value = false
  }
}

const scoreColor = computed(() => {
  if (!diagReport.value) return 'text-gray-400'
  if (diagReport.value.score >= 80) return 'text-green-500'
  if (diagReport.value.score >= 50) return 'text-yellow-500'
  return 'text-red-500'
})

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
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <i class="pi pi-envelope text-[var(--text-muted)]" />
              <span class="font-medium text-sm text-[var(--text)]">{{ m.name }}</span>
              <Tag :severity="m.active ? 'success' : 'secondary'"
                   :value="m.active ? t('mailbox.statusActive') : t('mailbox.statusInactive')"
                   class="text-xs" />
              <Tag v-if="m.dkimConfigured" severity="info" value="DKIM ✓" class="text-xs" />
              <Tag v-else severity="warn" value="Sin DKIM" class="text-xs" />
            </div>
            <p class="text-xs text-[var(--text-muted)]">
              SMTP: {{ m.smtpHost }}:{{ m.smtpPort }}
              &nbsp;|&nbsp;
              {{ t('mailbox.fromEmail') }}: {{ m.fromEmail }}
              <span v-if="m.lastPolledAt">
                &nbsp;·&nbsp;{{ t('mailbox.lastPolled') }}: {{ dayjs(m.lastPolledAt).fromNow() }}
              </span>
            </p>
            <p v-if="m.errorCount > 0" class="text-xs text-red-500 mt-0.5">
              {{ t('mailbox.errorCount', { count: m.errorCount }) }}: {{ m.lastError }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Button icon="pi pi-chart-bar" severity="secondary" size="small" outlined
                    :title="t('mailbox.deliverability')"
                    @click="openDeliverability(m)" />
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

    <!-- ── Mailbox Form Dialog ───────────────────────────────────────────── -->
    <Dialog v-model:visible="showForm" :header="formTitle" modal append-to="body"
            :style="{ width: '700px', maxWidth: '95vw' }"
            :closable="!saving" :close-on-escape="false" :dismissable-mask="false"
            @hide="resetForm">
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

        <!-- DKIM -->
        <div class="rounded-lg border border-[var(--border)] p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{{ t('mailbox.dkimSection') }}</h4>
            <Tag v-if="form.dkimSelector && (form.dkimPrivateKey && form.dkimPrivateKey !== '***')" severity="success" value="DKIM activo" class="text-xs" />
          </div>
          <p class="text-xs text-[var(--text-muted)]">{{ t('mailbox.dkimHint') }}</p>

          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2 sm:col-span-1">
              <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.dkimSelector') }}</label>
              <InputText v-model="form.dkimSelector" placeholder="mail" class="w-full text-sm" />
              <p v-if="form.dkimSelector && form.fromEmail.includes('@')" class="text-xs text-[var(--text-muted)] mt-1 font-mono">
                DNS: {{ form.dkimSelector }}._domainkey.{{ form.fromEmail.split('@')[1] }}
              </p>
            </div>
          </div>

          <div>
            <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.dkimPrivateKey') }}</label>
            <Textarea
              v-model="form.dkimPrivateKey"
              :placeholder="t('mailbox.dkimPrivateKeyPlaceholder')"
              class="w-full text-xs font-mono"
              :rows="5"
              auto-resize
            />
          </div>

          <!-- DNS instructions -->
          <div v-if="form.dkimSelector" class="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs space-y-1">
            <p class="font-semibold text-blue-700 dark:text-blue-300">{{ t('mailbox.dkimDnsInstructions') }}</p>
            <p class="text-blue-600 dark:text-blue-400">1. {{ t('mailbox.dkimStep1') }}</p>
            <code class="block bg-blue-100 dark:bg-blue-900/50 rounded px-2 py-1 font-mono mt-1 break-all">
              openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out dkim_private.pem
            </code>
            <p class="text-blue-600 dark:text-blue-400 mt-2">2. {{ t('mailbox.dkimStep2') }}</p>
            <code class="block bg-blue-100 dark:bg-blue-900/50 rounded px-2 py-1 font-mono break-all">
              openssl rsa -in dkim_private.pem -pubout -out dkim_public.pem
            </code>
            <p class="text-blue-600 dark:text-blue-400 mt-2">3. {{ t('mailbox.dkimStep3') }}</p>
            <code v-if="form.fromEmail.includes('@')" class="block bg-blue-100 dark:bg-blue-900/50 rounded px-2 py-1 font-mono break-all">
              {{ form.dkimSelector }}._domainkey.{{ form.fromEmail.split('@')[1] }} TXT "v=DKIM1; k=rsa; p=&lt;contenido_de_dkim_public.pem&gt;"
            </code>
            <p class="text-blue-600 dark:text-blue-400 mt-2">4. {{ t('mailbox.dkimStep4') }}</p>
          </div>
        </div>

        <!-- Poll interval -->
        <div class="flex items-center gap-3">
          <label class="text-xs text-[var(--text-muted)] shrink-0">{{ t('mailbox.pollInterval') }}</label>
          <InputNumber v-model="form.pollIntervalSec" :use-grouping="false" :min="30" class="w-24 text-sm" input-class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button :label="t('mailbox.cancel')" severity="secondary" outlined @click="requestCloseForm" />
        <Button :label="t('mailbox.save')" icon="pi pi-check" :loading="saving" @click="save" />
      </template>
    </Dialog>

    <!-- ── Test Send Dialog ─────────────────────────────────────────────────── -->
    <Dialog v-model:visible="testSendVisible" :header="t('mailbox.testSend')" modal append-to="body"
            :style="{ width: '400px', maxWidth: '95vw' }">
      <div class="py-2">
        <label class="text-xs text-[var(--text-muted)] mb-1 block">{{ t('mailbox.testSendTo') }}</label>
        <InputText v-model="testSendTo" type="email" placeholder="you@gmail.com" class="w-full" />
        <p class="text-xs text-[var(--text-muted)] mt-2">{{ t('mailbox.testSendHint') }}</p>
      </div>
      <template #footer>
        <Button :label="t('mailbox.cancel')" severity="secondary" outlined @click="testSendVisible = false" />
        <Button :label="t('mailbox.testSend')" icon="pi pi-send" :loading="sendingTest"
                :disabled="!testSendTo" @click="sendTestEmail" />
      </template>
    </Dialog>

    <!-- ── Deliverability Report Dialog ─────────────────────────────────────── -->
    <Dialog v-model:visible="diagVisible" :header="t('mailbox.deliverabilityReport')" modal append-to="body"
            :style="{ width: '600px', maxWidth: '95vw' }">
      <div class="py-2">
        <div v-if="diagLoading" class="space-y-3">
          <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-muted/30 animate-pulse" />
        </div>

        <template v-else-if="diagReport">
          <!-- Score -->
          <div class="flex items-center gap-4 mb-4 p-3 rounded-lg border border-[var(--border)]">
            <div :class="['text-4xl font-bold', scoreColor]">{{ diagReport.score }}</div>
            <div>
              <p class="font-semibold text-[var(--text)]">{{ t('mailbox.deliverabilityScore') }}</p>
              <p :class="['text-sm', scoreColor]">{{ diagReport.verdict }}</p>
            </div>
          </div>

          <!-- Checks -->
          <div class="space-y-2">
            <div
              v-for="check in diagReport.checks"
              :key="check.name"
              :class="['rounded-lg border p-3',
                check.passed && !check.action
                  ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30'
                  : check.passed && check.action
                  ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30'
                  : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30']"
            >
              <div class="flex items-start gap-2">
                <i :class="['pi mt-0.5 text-sm flex-shrink-0',
                  check.passed && !check.action ? 'pi-check-circle text-green-500'
                  : check.passed && check.action ? 'pi-info-circle text-yellow-500'
                  : 'pi-exclamation-circle text-red-500']" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-[var(--text)]">{{ check.message }}</p>
                  <p v-if="check.action" class="text-xs text-[var(--text-muted)] mt-1 whitespace-pre-wrap">{{ check.action }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <Button :label="t('common.close')" severity="secondary" outlined @click="diagVisible = false" />
      </template>
    </Dialog>
  </div>
</template>
