<script setup lang="ts">
defineProps<{ label: string; name: string; error?: string; required?: boolean }>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="name" class="text-sm font-medium text-[var(--text)]">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>
    <slot />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
