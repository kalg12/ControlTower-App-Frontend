<script setup lang="ts">
import { ref } from 'vue'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-vue-next'
import Spinner from './Spinner.vue'
import EmptyState from './EmptyState.vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface Props {
  columns: Column[]
  rows: Record<string, unknown>[]
  loading?: boolean
  rowKey?: string
  emptyTitle?: string
  emptyDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: 'id',
  emptyTitle: 'No data available',
  emptyDescription: ''
})

const emit = defineEmits<{
  sort: [key: string, dir: 'asc' | 'desc']
  rowClick: [row: Record<string, unknown>]
}>()

const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')

function handleSort(col: Column) {
  if (!col.sortable) return
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = col.key
    sortDir.value = 'asc'
  }
  emit('sort', sortKey.value, sortDir.value)
}

const alignClass: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}
</script>

<template>
  <div class="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
    <table class="w-full text-sm">
      <thead class="bg-[var(--bg-subtle)] border-b border-[var(--border)]">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :class="[
              'px-4 py-3 font-medium text-[var(--text-muted)] whitespace-nowrap text-xs uppercase tracking-wider',
              alignClass[col.align ?? 'left'],
              col.sortable ? 'cursor-pointer hover:text-[var(--text)] select-none' : ''
            ]"
            :style="col.width ? { width: col.width } : {}"
            @click="handleSort(col)"
          >
            <div class="flex items-center gap-1" :class="col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''">
              {{ col.label }}
              <template v-if="col.sortable">
                <ChevronUp v-if="sortKey === col.key && sortDir === 'asc'" class="w-3 h-3 text-[var(--primary)]" />
                <ChevronDown v-else-if="sortKey === col.key && sortDir === 'desc'" class="w-3 h-3 text-[var(--primary)]" />
                <ChevronsUpDown v-else class="w-3 h-3 opacity-40" />
              </template>
            </div>
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-[var(--border-subtle)]">
        <tr v-if="loading">
          <td :colspan="columns.length" class="py-16 text-center">
            <Spinner className="w-6 h-6 mx-auto text-[var(--primary)]" />
          </td>
        </tr>

        <template v-else>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length" class="py-12">
              <EmptyState :title="emptyTitle" :description="emptyDescription">
                <template #icon>
                  <slot name="empty-icon" />
                </template>
              </EmptyState>
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="String(row[rowKey])"
            class="bg-[var(--surface)] hover:bg-[var(--bg-subtle)] transition-colors duration-100"
            :class="{ 'cursor-pointer': !!$attrs.onRowClick }"
            @click="emit('rowClick', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="['px-4 py-3 text-[var(--text)]', alignClass[col.align ?? 'left']]"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
