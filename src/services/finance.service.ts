import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'
import type {
  Invoice, Payment, Expense, PurchaseRecord,
  InvoiceRequest, PaymentRequest, ExpenseRequest, PurchaseRequest,
  CashFlowSummary, FinanceFilters, ClientFinanceSummary,
  ExpenseSummary, ExpenseAdvancedFilters, FinanceReportEmailRequest,
  PurchaseFilters, PnlReport
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

  async deleteInvoice(id: string): Promise<void> {
    await api.delete(`/finance/invoices/${id}`)
  },

  async downloadInvoicePdf(id: string, number: string): Promise<void> {
    const res = await api.get(`/finance/invoices/${id}/pdf`, { responseType: 'blob' })
    triggerDownload(res.data, `invoice-${number}.pdf`)
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

  async listExpenses(filters?: ExpenseAdvancedFilters): Promise<PaginatedResponse<Expense>> {
    const res = await api.get<PaginatedResponse<Expense>>('/finance/expenses', { params: filters })
    return res.data
  },

  async getExpenseSummary(from: string, to: string): Promise<ExpenseSummary> {
    const res = await api.get<ExpenseSummary>('/finance/expenses/summary', { params: { from, to } })
    return res.data
  },

  async sendFinanceReport(data: FinanceReportEmailRequest): Promise<void> {
    await api.post('/finance/reports/email', data)
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

  async downloadExpenseReportPdf(from: string, to: string): Promise<void> {
    const res = await api.get('/finance/reports/expense-pdf', { params: { from, to }, responseType: 'blob' })
    triggerDownload(res.data, 'expense-report.pdf')
  },

  // ── Purchases ─────────────────────────────────────────────────────────

  async listPurchases(filters?: PurchaseFilters): Promise<PaginatedResponse<PurchaseRecord>> {
    const res = await api.get<PaginatedResponse<PurchaseRecord>>('/finance/purchases', { params: filters })
    return res.data
  },

  async getPurchase(id: string): Promise<PurchaseRecord> {
    const res = await api.get<PurchaseRecord>(`/finance/purchases/${id}`)
    return res.data
  },

  async createPurchase(data: PurchaseRequest): Promise<PurchaseRecord> {
    const res = await api.post<PurchaseRecord>('/finance/purchases', data)
    return res.data
  },

  async updatePurchase(id: string, data: PurchaseRequest): Promise<PurchaseRecord> {
    const res = await api.put<PurchaseRecord>(`/finance/purchases/${id}`, data)
    return res.data
  },

  async deletePurchase(id: string): Promise<void> {
    await api.delete(`/finance/purchases/${id}`)
  },

  // ── P&L Report ────────────────────────────────────────────────────────

  async getPnlReport(from: string, to: string): Promise<PnlReport> {
    const res = await api.get<PnlReport>('/finance/reports/pnl', { params: { from, to } })
    return res.data
  },

  async downloadPnlPdf(from: string, to: string): Promise<void> {
    const res = await api.get('/finance/reports/pnl-pdf', { params: { from, to }, responseType: 'blob' })
    triggerDownload(res.data, 'pnl-report.pdf')
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

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
