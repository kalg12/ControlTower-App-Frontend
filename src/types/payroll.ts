export type SalaryType = 'MONTHLY' | 'BIWEEKLY'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
export type PeriodType = 'MENSUAL' | 'QUINCENAL'
export type PeriodStatus = 'DRAFT' | 'PROCESSED' | 'PAID'

export interface Employee {
  id: string
  tenantId: string
  fullName: string
  rfc: string
  imssNumber?: string | null
  curp?: string | null
  department?: string | null
  position?: string | null
  salaryType: SalaryType
  baseSalary: number
  startDate: string
  status: EmployeeStatus
  email?: string | null
  bankAccount?: string | null
  createdAt: string
}

export interface PayrollItem {
  id: string
  employeeId: string
  employeeName: string
  employeeRfc: string
  daysWorked: number
  overtimeHours: number
  grossPay: number
  imssEmployee: number
  isr: number
  infonavit: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
  receiptSent: boolean
  receiptSentAt?: string | null
  notes?: string | null
}

export interface PayrollPeriod {
  id: string
  tenantId: string
  year: number
  periodNumber: number
  periodType: PeriodType
  startDate: string
  endDate: string
  status: PeriodStatus
  totalGross: number
  totalDeductions: number
  totalNet: number
  notes?: string | null
  createdAt: string
  items: PayrollItem[]
}

export interface EmployeeRequest {
  fullName: string
  rfc: string
  imssNumber?: string
  curp?: string
  department?: string
  position?: string
  salaryType: SalaryType
  baseSalary: number
  startDate: string
  email?: string
  bankAccount?: string
}

export interface PayrollPeriodRequest {
  year: number
  periodNumber: number
  periodType: PeriodType
  startDate: string
  endDate: string
  notes?: string
}

export interface PayrollItemUpdateRequest {
  daysWorked: number
  overtimeHours: number
  otherDeductions: number
  notes?: string
}
