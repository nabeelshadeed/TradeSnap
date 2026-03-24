export type ReminderTone = 'friendly' | 'firm' | 'final'
export type ReminderStage = 'pre_due' | 'day_after' | '3_days' | '7_days' | '14_days'

export interface EmailContext {
  customerFirstName: string
  contractorName: string
  contractorEmail: string
  invoiceNumber: string
  amount: string // formatted string e.g. "£1,250.00" or "$1,250.00"
  dueDate: string // formatted date string
  daysLate: number
  payUrl: string
  paymentTerms: string // e.g. "Net 30"
  currency: 'GBP' | 'USD'
}

export interface UkEmailContext extends EmailContext {
  currency: 'GBP'
  statutoryInterest?: string // formatted interest amount
  fixedCompensation?: string // £40/£70/£100
  bankSortCode?: string
  bankAccountNumber?: string
  bankAccountName?: string
  invoiceRef?: string
}

export interface UsEmailContext extends EmailContext {
  currency: 'USD'
  lateFeeAmount?: string // only if contractually agreed
  lateFeeClause?: string // the exact clause wording from the contract
  stateCode?: string
}

export interface EmailOutput {
  subject: string
  html: string
  tone: ReminderTone
}
