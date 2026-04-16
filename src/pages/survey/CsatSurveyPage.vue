<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { csatService } from '@/services/csat.service'
import type { CsatSurvey } from '@/types/csat'
import { Star, CheckCircle2, Zap } from 'lucide-vue-next'

const route = useRoute()
const token = route.params.token as string

const survey = ref<CsatSurvey | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const rating = ref(0)
const comment = ref('')
const submitting = ref(false)
const submitted = ref(false)

onMounted(async () => {
  try {
    survey.value = await csatService.getByToken(token)
    if (survey.value.respondedAt) {
      submitted.value = true
      rating.value = survey.value.rating ?? 0
      comment.value = survey.value.comment ?? ''
    }
  } catch {
    error.value = 'Esta encuesta no existe o el enlace es inválido.'
  } finally {
    loading.value = false
  }
})

async function submit() {
  if (rating.value === 0) return
  submitting.value = true
  try {
    const updated = await csatService.submit(token, { rating: rating.value, comment: comment.value || undefined })
    survey.value = updated
    submitted.value = true
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'No se pudo enviar tu respuesta.'
  } finally {
    submitting.value = false
  }
}

const ratingLabels: Record<number, string> = {
  1: 'Muy insatisfecho',
  2: 'Insatisfecho',
  3: 'Neutral',
  4: 'Satisfecho',
  5: 'Muy satisfecho'
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-8 text-white text-center">
        <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Zap class="w-7 h-7" />
        </div>
        <h1 class="text-xl font-bold">Control Tower</h1>
        <p class="text-indigo-100 text-sm mt-1">Encuesta de satisfacción</p>
      </div>

      <div class="px-8 py-8">
        <!-- Loading -->
        <div v-if="loading" class="space-y-4 animate-pulse">
          <div class="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mx-auto" />
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-4">
          <p class="text-red-500 font-medium">{{ error }}</p>
        </div>

        <!-- Already submitted -->
        <div v-else-if="submitted" class="text-center space-y-4">
          <CheckCircle2 class="w-16 h-16 text-green-500 mx-auto" />
          <h2 class="text-xl font-bold text-slate-800 dark:text-white">¡Gracias por tu respuesta!</h2>
          <p class="text-slate-500 dark:text-slate-400">Tu opinión nos ayuda a mejorar el servicio.</p>
          <div class="flex justify-center gap-0.5 mt-2">
            <Star v-for="n in 5" :key="n" :class="['w-7 h-7 transition-colors', n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 dark:text-slate-600']" />
          </div>
          <p v-if="comment" class="text-sm italic text-slate-500 dark:text-slate-400">"{{ comment }}"</p>
        </div>

        <!-- Survey form -->
        <div v-else-if="survey" class="space-y-6">
          <div class="text-center">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white">¿Cómo fue tu experiencia?</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Califica del 1 al 5</p>
          </div>

          <!-- Star rating -->
          <div class="flex justify-center gap-2">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="transition-transform hover:scale-110 focus:outline-none"
              @click="rating = n"
              @mouseenter="rating = n"
            >
              <Star
                :class="[
                  'w-10 h-10 transition-colors',
                  n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 dark:text-slate-600'
                ]"
              />
            </button>
          </div>
          <p v-if="rating > 0" class="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
            {{ ratingLabels[rating] }}
          </p>

          <!-- Comment -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Comentario (opcional)
            </label>
            <textarea
              v-model="comment"
              rows="4"
              placeholder="¿Qué podríamos mejorar?"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-400 resize-none transition-colors"
            />
          </div>

          <button
            type="button"
            :disabled="rating === 0 || submitting"
            class="w-full py-3 rounded-xl font-semibold text-white transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.98]"
            @click="submit"
          >
            {{ submitting ? 'Enviando…' : 'Enviar calificación' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
