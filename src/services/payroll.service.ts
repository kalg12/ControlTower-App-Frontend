import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'
import type {
  Employee, PayrollPeriod, PayrollItem,
  EmployeeRequest, PayrollPeriodRequest, PayrollItemUpdateRequest,
  EmployeeStatus
} from '@/types/payroll'

export const payrollService = {
  // ── Employees ──────────────────────────────────────────────────

  async listEmployees(params?: { status?: EmployeeStatus; page?: number; size?: number }): Promise<PaginatedResponse<Employee>> {
    const res = await api.get<PaginatedResponse<Employee>>('/payroll/employees', { params })
    return res.data
  },

  async createEmployee(data: EmployeeRequest): Promise<Employee> {
    const res = await api.post<Employee>('/payroll/employees', data)
    return res.data
  },

  async updateEmployee(id: string, data: EmployeeRequest): Promise<Employee> {
    const res = await api.put<Employee>(`/payroll/employees/${id}`, data)
    return res.data
  },

  async terminateEmployee(id: string): Promise<void> {
    await api.delete(`/payroll/employees/${id}`)
  },

  // ── Periods ────────────────────────────────────────────────────

  async listPeriods(params?: { page?: number; size?: number }): Promise<PaginatedResponse<PayrollPeriod>> {
    const res = await api.get<PaginatedResponse<PayrollPeriod>>('/payroll/periods', { params })
    return res.data
  },

  async getPeriod(id: string): Promise<PayrollPeriod> {
    const res = await api.get<PayrollPeriod>(`/payroll/periods/${id}`)
    return res.data
  },

  async createPeriod(data: PayrollPeriodRequest): Promise<PayrollPeriod> {
    const res = await api.post<PayrollPeriod>('/payroll/periods', data)
    return res.data
  },

  async processPeriod(id: string): Promise<PayrollPeriod> {
    const res = await api.post<PayrollPeriod>(`/payroll/periods/${id}/process`)
    return res.data
  },

  async closePeriod(id: string): Promise<PayrollPeriod> {
    const res = await api.post<PayrollPeriod>(`/payroll/periods/${id}/close`)
    return res.data
  },

  async updateItem(periodId: string, itemId: string, data: PayrollItemUpdateRequest): Promise<PayrollItem> {
    const res = await api.put<PayrollItem>(`/payroll/periods/${periodId}/items/${itemId}`, data)
    return res.data
  },

  async sendReceipt(periodId: string, itemId: string): Promise<PayrollItem> {
    const res = await api.post<PayrollItem>(`/payroll/periods/${periodId}/items/${itemId}/send-receipt`)
    return res.data
  },
}
