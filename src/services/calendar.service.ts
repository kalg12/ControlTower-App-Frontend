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
    assigneeId?: string
  }): Promise<CalendarEvent[]> {
    const res = await api.get<CalendarEvent[]>('/calendar', {
      params: {
        from: params.from || undefined,
        to: params.to || undefined,
        clientId: params.clientId || undefined,
        assigneeId: params.assigneeId || undefined
      }
    })
    return res.data
  },

  async create(body: CreateCalendarEventRequest): Promise<CalendarEvent> {
    const res = await api.post<CalendarEvent>('/calendar', body)
    return res.data
  },

  async update(id: string, body: UpdateCalendarEventRequest): Promise<CalendarEvent> {
    const res = await api.put<CalendarEvent>(`/calendar/${id}`, body)
    return res.data
  },

  async patchStatus(id: string, status: CalendarEventStatus): Promise<CalendarEvent> {
    const res = await api.patch<CalendarEvent>(`/calendar/${id}/status`, null, {
      params: { status }
    })
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/calendar/${id}`)
  }
}
