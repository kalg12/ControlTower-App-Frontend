export interface BranchStatusDetail {
  branchId: string
  branchName?: string
  clientName?: string
  status: 'DOWN' | 'DEGRADED'
}

export interface DashboardStats {
  totalClients: number
  activeBranches: number
  branchesUp: number
  branchesDown: number
  branchesDegraded: number
  openIncidents: number
  alertBranches: BranchStatusDetail[]
  openTickets: number
  ticketsInProgress: number
  slaBreachedTickets: number
  activeLicenses: number
  trialLicenses: number
  expiredLicenses: number
  unreadNotifications: number
}
