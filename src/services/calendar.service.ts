import api from '@/services/api'
import type {
  CalendarEvent,
  CalendarEventStatus,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest
} from '@/types/calendar'

export const calendarService = {
  async list(params: {
    from?: string
    to?: string
    clientId?: string
    personId?: string
    assigneeId?: string
  }): Promise<CalendarEvent[]> {
    const res = await api.get<{ data: CalendarEvent[] }>('/calendar', {
      params: {
        from: params.from || undefined,
        to: params.to || undefined,
        clientId: params.clientId || undefined,
        personId: params.personId || undefined,
        assigneeId: params.assigneeId || undefined
      }
    })
    return res.data.data ?? (res.data as unknown as CalendarEvent[])
  },

  async create(body: CreateCalendarEventRequest): Promise<CalendarEvent> {
    const res = await api.post<{ data: CalendarEvent }>('/calendar', body)
    return res.data.data ?? (res.data as unknown as CalendarEvent)
  },

  async update(id: string, body: UpdateCalendarEventRequest): Promise<CalendarEvent> {
    const res = await api.put<{ data: CalendarEvent }>(`/calendar/${id}`, body)
    return res.data.data ?? (res.data as unknown as CalendarEvent)
  },

  async patchStatus(id: string, status: CalendarEventStatus): Promise<CalendarEvent> {
    const res = await api.patch<{ data: CalendarEvent }>(`/calendar/${id}/status`, null, {
      params: { status }
    })
    return res.data.data ?? (res.data as unknown as CalendarEvent)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/calendar/${id}`)
  }
}
