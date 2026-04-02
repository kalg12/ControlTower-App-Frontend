import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { notesService, type NoteRequest } from '@/services/notes.service'
import { qk } from '@/queries/keys'

export function useNotesList(
  linkedTo?: MaybeRefOrGetter<string | undefined>,
  linkedId?: MaybeRefOrGetter<string | undefined>,
  page: MaybeRefOrGetter<number> = 0,
  size: MaybeRefOrGetter<number> = 20
) {
  return useQuery({
    queryKey: computed(() => [
      ...qk.notes(toValue(linkedTo), toValue(linkedId)),
      toValue(page),
      toValue(size)
    ]),
    queryFn: () =>
      notesService.list({
        linkedTo: toValue(linkedTo),
        linkedId: toValue(linkedId),
        page: toValue(page),
        size: toValue(size)
      }),
    staleTime: 30_000
  })
}

export function useNoteMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notes'] })

  return {
    create: useMutation({
      mutationFn: (body: NoteRequest) => notesService.create(body),
      onSuccess: invalidate
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: NoteRequest }) => notesService.update(id, body),
      onSuccess: invalidate
    }),
    remove: useMutation({
      mutationFn: (id: string) => notesService.delete(id),
      onSuccess: invalidate
    })
  }
}
