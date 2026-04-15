<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import { rolesService } from '@/services/users.service'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/user'
import { Shield } from 'lucide-vue-next'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'

const { t } = useI18n()
const toast = useToast()
const qc = useQueryClient()
const auth = useAuthStore()
const router = useRouter()

const canEdit = computed(() => auth.hasPermission('user:write'))
const canInviteUsers = computed(() => auth.hasPermission('user:write'))

const { data: rolesPage, isLoading } = useQuery({
  queryKey: ['roles', 'page0'],
  queryFn: () => rolesService.listRoles(0, 200),
  staleTime: 30_000
})

const { data: allPermissions } = useQuery({
  queryKey: ['permissions', 'all'],
  queryFn: () => rolesService.listPermissions(),
  staleTime: 120_000
})

const roles = computed(() => {
  const list = [...(rolesPage.value?.content ?? [])]
  const rank = (code: string | undefined) => {
    const c = code ?? ''
    if (c === 'ADMIN') return 0
    if (c === 'MEMBER') return 1
    return 2
  }
  list.sort((a, b) => {
    const d = rank(a.code) - rank(b.code)
    return d !== 0 ? d : (a.name ?? '').localeCompare(b.name ?? '')
  })
  return list
})

function inviteWithRole(roleId: string) {
  router.push({ name: 'users', query: { inviteWithRole: roleId } })
}

const byModule = computed(() => {
  const list = allPermissions.value ?? []
  const map = new Map<string, typeof list>()
  for (const p of list) {
    const m = p.module || 'other'
    if (!map.has(m)) map.set(m, [])
    map.get(m)!.push(p)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.code.localeCompare(b.code))
  }
  return map
})

const moduleKeys = computed(() => [...byModule.value.keys()].sort())

const showEditor = ref(false)
const editingRole = ref<Role | null>(null)
const selectedIds = ref<Set<string>>(new Set())
const saving = ref(false)

function openEditor(role: Role) {
  editingRole.value = role
  selectedIds.value = new Set(role.permissions ?? [])
  showEditor.value = true
}

function togglePerm(code: string, checked: boolean) {
  const s = new Set(selectedIds.value)
  if (checked) s.add(code)
  else s.delete(code)
  selectedIds.value = s
}

function isChecked(code: string) {
  return selectedIds.value.has(code)
}

async function savePermissions() {
  if (!editingRole.value || !allPermissions.value) return
  saving.value = true
  try {
    const ids = allPermissions.value
      .filter((p) => selectedIds.value.has(p.code))
      .map((p) => p.id)
    await rolesService.replaceRolePermissions(editingRole.value.id, ids)
    await qc.invalidateQueries({ queryKey: ['roles'] })
    showEditor.value = false
    toast.success(t('rolesPage.saved'))
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
        <Shield class="w-6 h-6 text-[var(--primary)]" />
        {{ t('rolesPage.title') }}
        <PageInfoButton :title="t('rolesPage.title')" :description="t('pageInfo.roles')" />
      </h1>
      <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('rolesPage.subtitle') }}</p>
    </div>

    <p v-if="!canEdit" class="text-sm text-amber-600">{{ t('rolesPage.readOnlyHint') }}</p>

    <DataTable :value="roles" :loading="isLoading" striped-rows class="rounded-xl overflow-hidden">
      <Column field="name" :header="t('rolesPage.role')" sortable />
      <Column field="code" :header="t('rolesPage.code')" sortable>
        <template #body="{ data }: { data: Role }">
          <Tag severity="secondary" class="text-xs font-mono">{{ data.code }}</Tag>
        </template>
      </Column>
      <Column field="description" :header="t('kanban.description')" />
      <Column :header="t('rolesPage.invite')" style="width: 130px">
        <template #body="{ data }: { data: Role }">
          <Button
            v-if="canInviteUsers"
            v-tooltip.top="t('rolesPage.inviteTooltip')"
            icon="pi pi-user-plus"
            size="small"
            text
            :aria-label="t('rolesPage.invite')"
            @click="inviteWithRole(data.id)"
          />
          <span v-else class="text-xs text-[var(--text-placeholder)]">—</span>
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 100px">
        <template #body="{ data }: { data: Role }">
          <Button
            :label="t('common.edit')"
            size="small"
            text
            :disabled="!canEdit"
            @click="openEditor(data)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showEditor"
      :header="editingRole ? `${t('rolesPage.edit')}: ${editingRole.name}` : ''"
      modal
      class="w-full max-w-2xl"
      :dismissable-mask="true"
    >
      <div v-if="editingRole" class="max-h-[60vh] overflow-y-auto space-y-6 pt-2">
        <p class="text-xs text-[var(--text-muted)]">{{ t('rolesPage.matrixHint') }}</p>
        <div v-for="mod in moduleKeys" :key="mod" class="border border-[var(--border)] rounded-lg p-3 space-y-2">
          <h3 class="text-sm font-semibold text-[var(--text)] uppercase tracking-wide">{{ mod }}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              v-for="perm in byModule.get(mod) ?? []"
              :key="perm.id"
              class="flex items-start gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                :model-value="isChecked(perm.code)"
                binary
                :disabled="!canEdit"
                @update:model-value="(v: boolean) => togglePerm(perm.code, v)"
              />
              <span>
                <span class="font-mono text-xs text-[var(--primary)]">{{ perm.code }}</span>
                <span v-if="perm.description" class="block text-[var(--text-muted)] text-xs">{{ perm.description }}</span>
              </span>
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showEditor = false" />
          <Button
            :label="t('common.save')"
            :loading="saving"
            :disabled="!canEdit"
            @click="savePermissions"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
