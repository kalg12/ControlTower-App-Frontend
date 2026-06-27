export interface MailboxConfig {
  id: string
  tenantId: string
  name: string
  imapHost: string
  imapPort: number
  imapSsl: boolean
  imapUsername: string
  imapFolder: string
  smtpHost: string
  smtpPort: number
  smtpSsl: boolean
  smtpUsername: string
  fromEmail: string
  fromName: string | null
  pollIntervalSec: number
  lastPolledAt: string | null
  lastError: string | null
  errorCount: number
  departmentId: string | null
  active: boolean
  createdAt: string
}

export interface MailboxRequest {
  name: string
  imapHost: string
  imapPort: number
  imapSsl: boolean
  imapUsername: string
  imapPassword: string
  imapFolder: string
  smtpHost: string
  smtpPort: number
  smtpSsl: boolean
  smtpUsername: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  pollIntervalSec: number
  departmentId: string | null
}
