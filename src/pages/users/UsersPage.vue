<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { usersService } from '@/services/users.service'
import dayjs from 'dayjs'
import type { User } from '@/types/user'
import { Shield, ShieldOff } from 'lucide-vue-next'

const page = ref(0)
const pageSize = 20
const globalFilter = ref('')

const { data: result, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['users', page.value]),
  queryFn: () => usersService.list({ page: page.value, size: pageSize }),
  staleTime: 15000
})

const users = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function statusSeverity(status: User['status']): 'success' | 'secondary' | 'danger' {
  const map: Record<string, 'success' | 'secondary' | 'danger'> = {
    ACTIVE: 'success',
    INACTIVE: 'secondary',
    SUSPENDED: 'danger'
  }
  return map[status] ?? 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0; refetch() }, 400)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Users</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total users</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Search -->
    <div class="flex gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search users..."
        class="max-w-md"
        @input="onSearch"
      />
    </div>

    <!-- DataTable -->
    <DataTable
      :value="users"
      :loading="isLoading"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
      lazy
      removable-sort
      striped-rows
      class="rounded-xl overflow-hidden"
      @page="onPage"
    >
      <Column field="fullName" header="User" sortable style="min-width: 200px">
        <template #body="{ data: row }: { data: User }">
          <div>
            <p class="text-sm font-medium text-[var(--text)]">{{ row.fullName }}</p>
            <p class="text-xs text-[var(--text-muted)]">{{ row.email }}</p>
          </div>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 110px">
        <template #body="{ data: row }: { data: User }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>

      <Column field="superAdmin" header="2FA / Admin" style="width: 120px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex items-center gap-2">
            <Shield v-if="row.twoFactorEnabled" class="w-4 h-4 text-green-500" title="2FA enabled" />
            <ShieldOff v-else class="w-4 h-4 text-[var(--text-muted)]" title="2FA disabled" />
            <Tag v-if="row.superAdmin" severity="warn" value="SuperAdmin" class="text-xs" />
          </div>
        </template>
      </Column>

      <Column field="roles" header="Roles" style="min-width: 160px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="role in row.roles"
              :key="role"
              severity="secondary"
              :value="role"
              class="text-xs"
            />
            <span v-if="!row.roles?.length" class="text-[var(--text-muted)] text-sm">—</span>
          </div>
        </template>
      </Column>

      <Column field="createdAt" header="Joined" sortable style="width: 130px">
        <template #body="{ data: row }: { data: User }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No users found</div>
      </template>
    </DataTable>
  </div>
</template>
