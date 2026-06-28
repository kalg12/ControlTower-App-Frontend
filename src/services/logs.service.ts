import api from '@/services/api'
import type { LogsFilters, RemoteLog } from '@/types/logs'
import type { PaginatedResponse } from '@/types/api'

export const logsService = {
  async list(filters?: LogsFilters): Promise<PaginatedResponse<RemoteLog>> {
    const res = await api.get<PaginatedResponse<RemoteLog>>('/monitoring/logs', { params: filters })
    return res.data
  }
}
