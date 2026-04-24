import api from '@/services/api'

export interface HistoryEntry {
  id: string
  tenantId: string
  userId: string
  userName: string | null
  userEmail: string | null
  action: string
  resourceType: string
  resourceId: string
  result: string
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  userAgent: string | null
  correlationId: string | null
  createdAt: string
}

export interface HistoryPage {
  content: HistoryEntry[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  empty: boolean
}

export const historyService = {
  getClientHistory(clientId: string, page = 0, size = 20) {
    return api.get<HistoryPage>(`/crm/history/client/${clientId}`, {
      params: { page, size },
    })
  },

  getBranchHistory(branchId: string, page = 0, size = 20) {
    return api.get<HistoryPage>(`/crm/history/branch/${branchId}`, {
      params: { page, size },
    })
  },

  getOpportunityHistory(opportunityId: string, page = 0, size = 20) {
    return api.get<HistoryPage>(`/crm/history/opportunity/${opportunityId}`, {
      params: { page, size },
    })
  },

  getContactHistory(contactId: string, page = 0, size = 20) {
    return api.get<HistoryPage>(`/crm/history/contact/${contactId}`, {
      params: { page, size },
    })
  },
}

export function parseHistoryChange(entry: HistoryEntry): {
  field: string
  oldValue: string | null
  newValue: string | null
} | null {
  const oldVal = entry.oldValue ? JSON.parse(entry.oldValue) : null
  const newVal = entry.newValue ? JSON.parse(entry.newValue) : null

  if (entry.action === 'CLIENT_STATUS_CHANGED' || entry.action === 'BRANCH_STATUS_CHANGED') {
    return {
      field: 'Estado',
      oldValue: oldVal?.status || null,
      newValue: newVal?.status || null,
    }
  }

  if (entry.action === 'OPPORTUNITY_STAGE_CHANGED') {
    return {
      field: 'Etapa',
      oldValue: oldVal?.stage || null,
      newValue: newVal?.stage || null,
    }
  }

  if (entry.action === 'OPPORTUNITY_VALUE_CHANGED') {
    return {
      field: 'Valor',
      oldValue: oldVal?.value || null,
      newValue: newVal?.value || null,
    }
  }

  if (entry.action === 'CLIENT_SEGMENT_CHANGED') {
    return {
      field: 'Segmento',
      oldValue: oldVal?.segment || null,
      newValue: newVal?.segment || null,
    }
  }

  if (entry.action === 'CLIENT_ASSIGNED_USER_CHANGED' || 
      entry.action === 'OPPORTUNITY_ASSIGNED_USER_CHANGED' ||
      entry.action === 'BRANCH_ASSIGNED_USER_CHANGED') {
    return {
      field: 'Asignado',
      oldValue: oldVal?.accountOwnerId || oldVal?.ownerId || null,
      newValue: newVal?.accountOwnerId || newVal?.ownerId || null,
    }
  }

  if (entry.action === 'PROSPECT_CONVERTED') {
    return {
      field: 'Conversión',
      oldValue: 'Prospecto',
      newValue: 'Cliente',
    }
  }

  if (entry.action === 'PROSPECT_LOST') {
    return {
      field: 'Estado',
      oldValue: 'Prospecto',
      newValue: 'Perdido',
    }
  }

  if (entry.action === 'OPPORTUNITY_WON') {
    return {
      field: 'Resultado',
      oldValue: 'En progreso',
      newValue: 'Ganado',
    }
  }

  if (entry.action === 'OPPORTUNITY_LOST') {
    return {
      field: 'Resultado',
      oldValue: 'En progreso',
      newValue: 'Perdido',
    }
  }

  return null
}
