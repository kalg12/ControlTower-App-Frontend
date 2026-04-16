import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { kbService } from '@/services/kb.service'
import type { KbArticleFilters, KbArticleRequest } from '@/types/knowledge-base'
import { qk } from './keys'

export function useKbArticles(filters?: MaybeRefOrGetter<KbArticleFilters | undefined>) {
  return useQuery({
    queryKey: computed(() => qk.kbArticles(JSON.stringify(toValue(filters) ?? {}))),
    queryFn: () => kbService.list(toValue(filters) ?? {}),
    staleTime: 5 * 60 * 1000
  })
}

export function useKbArticle(id: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => qk.kbArticle(toValue(id))),
    queryFn: () => kbService.getById(toValue(id)),
    staleTime: 5 * 60 * 1000
  })
}

export function useKbMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['kb-articles'] })

  return {
    create: useMutation({
      mutationFn: (data: KbArticleRequest) => kbService.create(data),
      onSuccess: invalidate
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: string; data: KbArticleRequest }) => kbService.update(id, data),
      onSuccess: invalidate
    }),
    remove: useMutation({
      mutationFn: (id: string) => kbService.delete(id),
      onSuccess: invalidate
    })
  }
}
