<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import { useToast } from '@/composables/useToast'
import { cloudinaryService, type CloudinaryUploadResult } from '@/services/cloudinary.service'

const props = defineProps<{
  folder?: string
  size?: 'small' | 'normal'
}>()

const emit = defineEmits<{
  uploaded: [result: CloudinaryUploadResult]
}>()

const { t } = useI18n()
const toast = useToast()
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > MAX_SIZE_BYTES) {
    toast.error(`${t('imageUpload.maxSize')} (10 MB)`)
    return
  }

  uploading.value = true
  try {
    const result = await cloudinaryService.upload(file, props.folder ?? 'control-tower')
    toast.success(t('imageUpload.uploadSuccess'))
    emit('uploaded', result)
  } catch {
    toast.error(t('imageUpload.uploadError'))
  } finally {
    uploading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}
</script>

<template>
  <span>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      class="hidden"
      @change="onFileChange"
    />
    <Button
      icon="pi pi-image"
      :severity="'secondary'"
      :size="size ?? 'small'"
      outlined
      :loading="uploading"
      :title="t('imageUpload.attachImage')"
      @click="fileInputRef?.click()"
    />
  </span>
</template>
