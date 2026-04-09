<script setup lang="ts">
import type { PosContext } from '@/types/ticket'

defineProps<{ ctx: PosContext }>()
</script>

<template>
  <div class="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-5">
    <div class="flex items-center gap-2 mb-3">
      <i class="pi pi-shopping-cart text-orange-500" />
      <span class="text-sm font-semibold text-orange-600 dark:text-orange-400">POS Origin</span>
    </div>

    <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <span class="text-[var(--text-muted)]">Branch</span>
      <span class="text-[var(--text)]">{{ ctx.branchName ?? '—' }}</span>

      <span class="text-[var(--text-muted)]">Submitted by</span>
      <span class="text-[var(--text)]">{{ ctx.submittedBy ?? '—' }}</span>

      <span v-if="ctx.submitterEmail" class="text-[var(--text-muted)]">Email</span>
      <span v-if="ctx.submitterEmail" class="text-[var(--text)]">{{ ctx.submitterEmail }}</span>

      <span v-if="ctx.category" class="text-[var(--text-muted)]">Category</span>
      <span v-if="ctx.category" class="text-[var(--text)] capitalize">{{ ctx.category.toLowerCase() }}</span>

      <span class="text-[var(--text-muted)]">POS Ticket ID</span>
      <span class="font-mono text-xs text-[var(--text-muted)] truncate">{{ ctx.posTicketId ?? '—' }}</span>
    </div>
  </div>
</template>
