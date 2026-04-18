import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'
import type {
  Invoice, Payment, Expense,
  InvoiceRequest, PaymentRequest, ExpenseRequest,
  CashFlowSummary, FinanceFilters, ClientFinanceSummary
} from '@/types/finance'

export const financeService = {
  // ── Invoices ──────────────────────────────────────────────────────────

  async listInvoices(filters?: FinanceFilters): Promise<PaginatedResponse<Invoice>> {
    const res = await api.get<PaginatedResponse<Invoice>>('/finance/invoices', { params: filters })
    return res.data
  },

  async getInvoice(id: string): Promise<Invoice> {
    const res = await api.get<Invoice>(`/finance/invoices/${id}`)
    return res.data
  },

  async createInvoice(data: InvoiceRequest): Promise<Invoice> {
    const res = await api.post<Invoice>('/finance/invoices', data)
    return res.data
  },

  async updateInvoice(id: string, data: InvoiceRequest): Promise<Invoice> {
    const res = await api.put<Invoice>(`/finance/invoices/${id}`, data)
    return res.data
  },

  async sendInvoice(id: string): Promise<Invoice> {
    const res = await api.post<Invoice>(`/finance/invoices/${id}/send`)
    return res.data
  },

  async payInvoice(id: string, paidAt?: string): Promise<Invoice> {
    const res = await api.post<Invoice>(`/finance/invoices/${id}/pay`, paidAt ? { paidAt } : undefined)
    return res.data
  },

  async voidInvoice(id: string): Promise<Invoice> {
    const res = await api.post<Invoice>(`/finance/invoices/${id}/void`)
    return res.data
  },

  // ── Payments ─────────────────────────────────────────────────────────

  async listPayments(filters?: { clientId?: string; page?: number; size?: number }): Promise<PaginatedResponse<Payment>> {
    const res = await api.get<PaginatedResponse<Payment>>('/finance/payments', { params: filters })
    return res.data
  },

  async createPayment(data: PaymentRequest): Promise<Payment> {
    const res = await api.post<Payment>('/finance/payments', data)
    return res.data
  },

  async deletePayment(id: string): Promise<void> {
    await api.delete(`/finance/payments/${id}`)
  },

  // ── Expenses ─────────────────────────────────────────────────────────

  async listExpenses(filters?: { category?: string; clientId?: string; page?: number; size?: number }): Promise<PaginatedResponse<Expense>> {
    const res = await api.get<PaginatedResponse<Expense>>('/finance/expenses', { params: filters })
    return res.data
  },

  async createExpense(data: ExpenseRequest): Promise<Expense> {
    const res = await api.post<Expense>('/finance/expenses', data)
    return res.data
  },

  async updateExpense(id: string, data: ExpenseRequest): Promise<Expense> {
    const res = await api.put<Expense>(`/finance/expenses/${id}`, data)
    return res.data
  },

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`/finance/expenses/${id}`)
  },

  // ── Client Summary ────────────────────────────────────────────────────

  async getClientSummary(clientId: string): Promise<ClientFinanceSummary> {
    const res = await api.get<ClientFinanceSummary>(`/finance/clients/${clientId}/summary`)
    return res.data
  },

  // ── Cash Flow ─────────────────────────────────────────────────────────

  async getCashFlow(from: string, to: string): Promise<CashFlowSummary> {
    const res = await api.get<CashFlowSummary>('/finance/cash-flow', { params: { from, to } })
    return res.data
  }
}
