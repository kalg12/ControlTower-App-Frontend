export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'VOIDED'
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'CHECK' | 'CRYPTO' | 'OTHER'
export type ExpenseCategory = 'PAYROLL' | 'SERVICES' | 'RENT' | 'MARKETING' | 'TECH' | 'TRAVEL' | 'SUPPLIES' | 'TAXES' | 'OTHER'

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  position: number
  createdAt: string
}

export interface Invoice {
  id: string
  tenantId: string
  clientId?: string | null
  clientName?: string | null
  clientTaxId?: string | null
  number: string
  status: InvoiceStatus
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  currency: string
  notes?: string | null
  issuedAt?: string | null
  dueDate?: string | null
  paidAt?: string | null
  lineItems: InvoiceLineItem[]
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  tenantId: string
  clientId?: string | null
  clientName?: string | null
  invoiceId?: string | null
  amount: number
  currency: string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
  paidAt: string
  createdAt: string
}

export interface Expense {
  id: string
  tenantId: string
  clientId?: string | null
  clientName?: string | null
  category: ExpenseCategory
  description: string
  amount: number
  currency: string
  vendor?: string | null
  receiptUrl?: string | null
  notes?: string | null
  paidAt: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceLineItemRequest {
  description: string
  quantity: number
  unitPrice: number
  position?: number
}

export interface InvoiceRequest {
  clientId?: string
  currency?: string
  taxRate?: number
  notes?: string
  issuedAt?: string
  dueDate?: string
  lineItems: InvoiceLineItemRequest[]
}

export interface PaymentRequest {
  clientId?: string
  invoiceId?: string
  amount: number
  currency?: string
  method?: PaymentMethod
  reference?: string
  notes?: string
  paidAt?: string
}

export interface ExpenseRequest {
  clientId?: string
  category?: ExpenseCategory
  description: string
  amount: number
  currency?: string
  vendor?: string
  receiptUrl?: string
  notes?: string
  paidAt?: string
}

export interface MonthlyEntry {
  month: string
  income: number
  expenses: number
  net: number
}

export interface CashFlowSummary {
  totalIncome: number
  totalExpenses: number
  netFlow: number
  byMonth: MonthlyEntry[]
}

export interface FinanceFilters {
  status?: InvoiceStatus
  clientId?: string
  category?: ExpenseCategory
  page?: number
  size?: number
}

export interface ClientFinanceSummary {
  clientId: string
  clientName: string
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  totalExpenses: number
  invoiceCount: number
  paymentCount: number
  expenseCount: number
  lastInvoiceAt?: string | null
}
