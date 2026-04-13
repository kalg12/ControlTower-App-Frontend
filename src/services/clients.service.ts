import api from '@/services/api'
import type { Client, ClientBranch, ClientContact, CreateClientRequest, UpdateClientRequest, ClientFilters, CreateBranchRequest, CreateContactRequest } from '@/types/client'
import type { PaginatedResponse } from '@/types/api'

export const clientsService = {
  async list(filters?: ClientFilters): Promise<PaginatedResponse<Client>> {
    const res = await api.get<PaginatedResponse<Client>>('/clients', { params: filters })
    return res.data
  },

  async getById(id: string): Promise<Client> {
    const res = await api.get<Client>(`/clients/${id}`)
    return res.data
  },

  async create(data: CreateClientRequest): Promise<Client> {
    const res = await api.post<Client>('/clients', data)
    return res.data
  },

  async update(id: string, data: UpdateClientRequest): Promise<Client> {
    // Backend: PUT /api/v1/clients/{clientId} (not PATCH)
    const res = await api.put<Client>(`/clients/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/clients/${id}`)
  },

  async getBranches(clientId: string): Promise<ClientBranch[]> {
    const res = await api.get<ClientBranch[]>(`/clients/${clientId}/branches`)
    return res.data
  },

  async createBranch(clientId: string, data: CreateBranchRequest): Promise<ClientBranch> {
    const res = await api.post<ClientBranch>(`/clients/${clientId}/branches`, data)
    return res.data
  },

  async updateBranch(clientId: string, branchId: string, data: Partial<ClientBranch>): Promise<ClientBranch> {
    const res = await api.patch<ClientBranch>(`/clients/${clientId}/branches/${branchId}`, {
      name: data.name,
      address: data.address,
      city: data.city,
      country: data.country,
      timezone: data.timezone,
      active: data.isActive
    })
    return res.data
  },

  async deleteBranch(_clientId: string, branchId: string): Promise<void> {
    await api.delete(`/clients/branches/${branchId}`)
  },

  async getContacts(clientId: string): Promise<ClientContact[]> {
    const res = await api.get<ClientContact[]>(`/clients/${clientId}/contacts`)
    return res.data
  },

  async addContact(clientId: string, data: CreateContactRequest): Promise<ClientContact> {
    const res = await api.post<ClientContact>(`/clients/${clientId}/contacts`, data)
    return res.data
  },

  async updateContact(clientId: string, contactId: string, data: CreateContactRequest): Promise<ClientContact> {
    const res = await api.put<ClientContact>(`/clients/${clientId}/contacts/${contactId}`, data)
    return res.data
  },

  async deleteContact(clientId: string, contactId: string): Promise<void> {
    await api.delete(`/clients/${clientId}/contacts/${contactId}`)
  }
}
