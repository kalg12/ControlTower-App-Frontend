export type CalendarEventType =
  | 'CALL'
  | 'MEETING'
  | 'SITE_VISIT'
  | 'DEMO'
  | 'FOLLOW_UP'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'OTHER'

export type CalendarEventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type ContactChannel =
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'EMAIL'
  | 'PHONE'
  | 'IN_PERSON'

export interface CalendarEvent {
  id: string
  tenantId: string
  title: string
  description?: string
  eventType: CalendarEventType
  startAt: string
  endAt: string
  clientId?: string
  clientName?: string
  branchId?: string
  status: CalendarEventStatus
  notes?: string
  outcome?: string
  contactChannel?: ContactChannel
  createdBy: string
  assigneeIds: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateCalendarEventRequest {
  title: string
  eventType: CalendarEventType
  startAt: string
  endAt: string
  clientId?: string
  branchId?: string
  description?: string
  notes?: string
  outcome?: string
  contactChannel?: ContactChannel
  assigneeIds?: string[]
  status?: CalendarEventStatus
}

export interface UpdateCalendarEventRequest extends CreateCalendarEventRequest {}
