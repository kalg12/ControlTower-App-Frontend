import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'

export interface ClientReminder {
  id: string
  tenantId: string
  clientId: string
  clientName?: string
  title: string
  description?: string
  recurrenceType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'
  recurrenceDays?: number
  startDate: string
  nextDueDate: string
  lastCompletedDate?: string
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  maxOccurrences?: number
  occurrencesCount: number
  notifyUserIds: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ClientReminderHistory {
  id: string
  reminderId: string
  completedBy: string
  completedAt: string
  notes?: string
  outcome: 'COMPLETED' | 'SNOOZED' | 'SKIPPED'
}

export interface CreateReminderRequest {
  clientId: string
  title: string
  description?: string
  recurrenceType: ClientReminder['recurrenceType']
  recurrenceDays?: number
  startDate: string
  maxOccurrences?: number
  notifyUserIds: string[]
}

export const remindersService = {
  async list(params?: {
    clientId?: string
    status?: ClientReminder['status']
    page?: number
    size?: number
  }): Promise<PaginatedResponse<ClientReminder>> {
    const res = await api.get<PaginatedResponse<ClientReminder>>('/reminders', { params })
    return res.data
  },

  async getByClient(clientId: string): Promise<ClientReminder[]> {
    const res = await api.get<ClientReminder[]>(`/reminders/client/${clientId}`)
    return res.data
  },

  async create(data: CreateReminderRequest): Promise<ClientReminder> {
    const res = await api.post<ClientReminder>('/reminders', data)
    return res.data
  },

  async update(id: string, data: Partial<CreateReminderRequest>): Promise<ClientReminder> {
    const res = await api.put<ClientReminder>(`/reminders/${id}`, data)
    return res.data
  },

  async complete(id: string, notes?: string): Promise<void> {
    await api.post(`/reminders/${id}/complete`, null, { params: { notes } })
  },

  async snooze(id: string, days: number = 1, notes?: string): Promise<void> {
    await api.post(`/reminders/${id}/snooze`, null, { params: { days, notes } })
  },

  async pause(id: string): Promise<void> {
    await api.post(`/reminders/${id}/pause`)
  },

  async resume(id: string): Promise<void> {
    await api.post(`/reminders/${id}/resume`)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/reminders/${id}`)
  },

  async getHistory(id: string): Promise<ClientReminderHistory[]> {
    const res = await api.get<ClientReminderHistory[]>(`/reminders/${id}/history`)
    return res.data
  },
}