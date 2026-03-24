import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  date,
  timestamp,
  bigserial,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planTierEnum = pgEnum('plan_tier', ['free', 'starter', 'pro', 'business'])

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'worker'])

export const tradeTypeEnum = pgEnum('trade_type', [
  'electrician',
  'plumber',
  'roofer',
  'hvac',
  'painter',
  'tiler',
  'landscaper',
  'carpenter',
  'gas-engineer',
  'general-builder',
  'other',
])

export const jobStatusEnum = pgEnum('job_status', [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'in_progress',
  'completed',
  'invoiced',
  'part_paid',
  'paid',
  'overdue',
  'disputed',
  'cancelled',
  'lost',
])

export const paymentStatusEnum = pgEnum('payment_status', [
  'none',
  'deposit_pending',
  'deposit_paid',
  'partial',
  'paid',
  'refunded',
  'disputed',
])

export const riskLevelEnum = pgEnum('risk_level', ['good', 'average', 'slow', 'avoid'])

export const escalationStageEnum = pgEnum('escalation_stage', [
  'none',
  'reminder_1',
  'reminder_2',
  'firm_notice',
  'final_notice',
  'legal',
])

// New enums for UK/US dual-country support
export const operatingCountryEnum = pgEnum('operating_country', ['UK', 'US'])

export const legalModeEnum = pgEnum('legal_mode', [
  'statutory',    // UK — Late Payment of Commercial Debts Act 1998
  'contract_only', // US — enforcement via contract terms only
])

export const paymentTermsTypeEnum = pgEnum('payment_terms_type', [
  'net7',
  'net14',
  'net30',
  'net60',
  'custom',
])

export const lateFeeTypeEnum = pgEnum('late_fee_type', [
  'percent', // e.g. 1.5% per month
  'fixed',   // e.g. $50 flat
  'none',
])

export const delayReasonEnum = pgEnum('delay_reason', [
  'awaiting_approval',
  'invoice_issue',
  'payment_run',
  'admin_error',
  'dispute',
  'unknown',
])

export const contactLogTypeEnum = pgEnum('contact_log_type', [
  'call',
  'email',
  'message',
  'visit',
  'note',
])

export const contactOutcomeEnum = pgEnum('contact_outcome', [
  'promised_payment',
  'no_answer',
  'dispute_raised',
  'paid',
  'referred_to_manager',
  'other',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const contractors = pgTable('contractors', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkOrgId: varchar('clerk_org_id', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  tradeType: tradeTypeEnum('trade_type').notNull().default('other'),
  teamSize: varchar('team_size', { length: 10 }),
  avgJobValue: numeric('avg_job_value', { precision: 10, scale: 2 }),
  usesDeposits: boolean('uses_deposits').default(true),
  biggestProblem: varchar('biggest_problem', { length: 50 }),
  plan: planTierEnum('plan').notNull().default('free'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  jobsThisMonth: integer('jobs_this_month').default(0),
  aiUsesThisMonth: integer('ai_uses_this_month').default(0),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
  stripeSubId: varchar('stripe_sub_id', { length: 255 }).unique(),
  logoUrl: text('logo_url'),
  primaryColour: varchar('primary_colour', { length: 7 }).default('#f97316'),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 255 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressPostcode: varchar('address_postcode', { length: 20 }),
  country: varchar('country', { length: 5 }).default('GB'),
  // ─── Country & Legal Mode ────────────────────────────────────────────────────
  // operatingCountry is the authoritative field for legal/tax logic.
  // 'UK' → statutory mode (Late Payment Act 1998)
  // 'US' → contract-only mode (no automatic interest)
  operatingCountry: operatingCountryEnum('operating_country').notNull().default('UK'),
  operatingState: varchar('operating_state', { length: 50 }), // US: 'CA', 'TX', etc.
  legalMode: legalModeEnum('legal_mode').notNull().default('statutory'),
  // US-only: default late fee to add to contracts (only enforceable if signed)
  defaultLateFeeType: lateFeeTypeEnum('default_late_fee_type').default('none'),
  defaultLateFeeAmount: numeric('default_late_fee_amount', { precision: 6, scale: 2 }),
  // US-only: require explicit payment terms (no assumption)
  requireExplicitTerms: boolean('require_explicit_terms').default(false),
  currency: varchar('currency', { length: 3 }).default('GBP'),
  taxLabel: varchar('tax_label', { length: 20 }).default('VAT'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('20'),
  taxRegistered: boolean('tax_registered').default(false),
  taxNumber: varchar('tax_number', { length: 30 }),
  companyReg: varchar('company_reg', { length: 30 }),
  invoicePrefix: varchar('invoice_prefix', { length: 10 }).default('INV'),
  invoiceSequence: integer('invoice_sequence').default(1000),
  pricePrefix: varchar('price_prefix', { length: 10 }).default('QT'),
  priceSequence: integer('price_sequence').default(1),
  defaultPaymentDays: integer('default_payment_days').default(14),
  defaultDepositPct: numeric('default_deposit_pct', { precision: 4, scale: 1 }).default('25'),
  defaultTerms: text('default_terms'),
  invoiceFooter: text('invoice_footer'),
  signatureDataUrl: text('signature_data_url'),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccountName: varchar('bank_account_name', { length: 100 }),
  bankSortCode: varchar('bank_sort_code', { length: 10 }),
  bankAccountNumber: varchar('bank_account_number', { length: 20 }),
  bankIban: varchar('bank_iban', { length: 34 }),
  bankSwift: varchar('bank_swift', { length: 11 }),
  // Open Banking
  obConnected: boolean('ob_connected').default(false),
  obProvider: varchar('ob_provider', { length: 20 }),
  obAccessToken: text('ob_access_token'),
  obRefreshToken: text('ob_refresh_token'),
  obTokenExpiresAt: timestamp('ob_token_expires_at', { withTimezone: true }),
  obLastSyncAt: timestamp('ob_last_sync_at', { withTimezone: true }),
  // Stats (cached)
  totalPaidYtd: numeric('total_paid_ytd', { precision: 12, scale: 2 }).default('0'),
  totalOutstanding: numeric('total_outstanding', { precision: 12, scale: 2 }).default('0'),
  avgPaymentDays: integer('avg_payment_days'),
  // Flags
  isActive: boolean('is_active').default(true),
  onboardingDone: boolean('onboarding_done').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: varchar('clerk_user_id', { length: 255 }).unique().notNull(),
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').default('owner'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  avatarUrl: text('avatar_url'),
  pushSubscription: jsonb('push_subscription'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
})

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }),
  companyName: varchar('company_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressPostcode: varchar('address_postcode', { length: 20 }),
  notes: text('notes'),
  source: varchar('source', { length: 50 }),
  // Risk scoring
  riskLevel: riskLevelEnum('risk_level').default('good'),
  avgPaymentDays: integer('avg_payment_days'),
  totalJobs: integer('total_jobs').default(0),
  totalInvoiced: numeric('total_invoiced', { precision: 12, scale: 2 }).default('0'),
  totalPaid: numeric('total_paid', { precision: 12, scale: 2 }).default('0'),
  totalOutstanding: numeric('total_outstanding', { precision: 12, scale: 2 }).default('0'),
  disputeCount: integer('dispute_count').default(0),
  cancellationCount: integer('cancellation_count').default(0),
  latePaymentCount: integer('late_payment_count').default(0),
  onTimeCount: integer('on_time_count').default(0),
  riskLastUpdated: timestamp('risk_last_updated', { withTimezone: true }),
  riskNotes: text('risk_notes'),
  isBlacklisted: boolean('is_blacklisted').default(false),
  isArchived: boolean('is_archived').default(false),
  // Community intelligence
  communityRiskScore: integer('community_risk_score'),
  communityReportCount: integer('community_report_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => ({
  contractorIdIdx: index('customers_contractor_id_idx').on(t.contractorId),
}))

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  referenceNumber: varchar('reference_number', { length: 50 }),
  invoiceNumber: varchar('invoice_number', { length: 50 }),
  title: varchar('title', { length: 255 }).notNull(),
  tradeCategory: varchar('trade_category', { length: 50 }),
  status: jobStatusEnum('status').default('draft'),
  paymentStatus: paymentStatusEnum('payment_status').default('none'),
  escalationStage: escalationStageEnum('escalation_stage').default('none'),
  // Site
  siteAddress: varchar('site_address', { length: 255 }),
  siteCity: varchar('site_city', { length: 100 }),
  sitePostcode: varchar('site_postcode', { length: 20 }),
  siteSameAsCustomer: boolean('site_same_as_customer').default(false),
  // AI
  voiceTranscript: text('voice_transcript'),
  aiPrompt: text('ai_prompt'),
  aiResponseRaw: jsonb('ai_response_raw'),
  aiGeneratedAt: timestamp('ai_generated_at', { withTimezone: true }),
  // Change orders
  changeOrders: jsonb('change_orders').default('[]'),
  // Financial
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0'),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).default('0'),
  depositPct: numeric('deposit_pct', { precision: 4, scale: 1 }).default('0'),
  depositAmount: numeric('deposit_amount', { precision: 12, scale: 2 }).default('0'),
  depositPaid: numeric('deposit_paid', { precision: 12, scale: 2 }).default('0'),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default('0'),
  balanceDue: numeric('balance_due', { precision: 12, scale: 2 }).default('0'),
  lateFeeApplied: numeric('late_fee_applied', { precision: 12, scale: 2 }).default('0'),
  statutoryInterest: numeric('statutory_interest', { precision: 12, scale: 2 }).default('0'),
  // ─── Payment Terms (country-aware) ──────────────────────────────────────────
  // paymentTermsType is the canonical field. paymentTermsDays is derived from it
  // and stored for query convenience.
  // UK: defaults to net30 if not set. US: REQUIRED — no default assumed.
  paymentTermsType: paymentTermsTypeEnum('payment_terms_type').default('net30'),
  paymentTermsDays: integer('payment_terms_days').default(30),
  dueDate: date('due_date'),
  earlyPayDiscountPct: numeric('early_pay_discount_pct', { precision: 4, scale: 1 }).default('0'),
  earlyPayDays: integer('early_pay_days'),
  // ─── Late Fee (US: only enforceable if signed into contract) ─────────────────
  lateFeeType: lateFeeTypeEnum('late_fee_type').default('none'),
  lateFeeAmount: numeric('late_fee_amount', { precision: 6, scale: 2 }),
  // ─── Payment Behaviour Tracking ──────────────────────────────────────────────
  delayReason: delayReasonEnum('delay_reason'),
  softChasingMode: boolean('soft_chasing_mode').default(true),
  remindersPaused: boolean('reminders_paused').default(false),
  // ─── Extended reminder timestamps (pre-due + day-after) ─────────────────────
  reminderPreDueAt: timestamp('reminder_pre_due_at', { withTimezone: true }),
  reminderDayAfterAt: timestamp('reminder_day_after_at', { withTimezone: true }),
  // Notes
  internalNotes: text('internal_notes'),
  customerNotes: text('customer_notes'),
  notIncluded: text('not_included'),
  // Legal / audit tokens
  quoteToken: varchar('quote_token', { length: 64 }).unique(),
  invoiceToken: varchar('invoice_token', { length: 64 }).unique(),
  receiptToken: varchar('receipt_token', { length: 64 }).unique(),
  // R2 keys
  quotePdfKey: text('quote_pdf_key'),
  signedPdfKey: text('signed_pdf_key'),
  invoicePdfKey: text('invoice_pdf_key'),
  // Timestamps
  visitDate: date('visit_date'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  estimatedDays: integer('estimated_days'),
  quoteSentAt: timestamp('quote_sent_at', { withTimezone: true }),
  quoteViewedAt: timestamp('quote_viewed_at', { withTimezone: true }),
  quoteViewedCount: integer('quote_viewed_count').default(0),
  quoteSignedAt: timestamp('quote_signed_at', { withTimezone: true }),
  signerName: varchar('signer_name', { length: 100 }),
  signerEmail: varchar('signer_email', { length: 100 }),
  signerIp: varchar('signer_ip', { length: 45 }),
  signerUa: text('signer_ua'),
  customerSignatureDataUrl: text('customer_signature_data_url'),
  invoiceSentAt: timestamp('invoice_sent_at', { withTimezone: true }),
  invoiceViewedAt: timestamp('invoice_viewed_at', { withTimezone: true }),
  invoiceViewedCount: integer('invoice_viewed_count').default(0),
  dueDateAt: timestamp('due_date_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  // Reminders
  reminder3At: timestamp('reminder_3_at', { withTimezone: true }),
  reminder7At: timestamp('reminder_7_at', { withTimezone: true }),
  reminder14At: timestamp('reminder_14_at', { withTimezone: true }),
  reminder30At: timestamp('reminder_30_at', { withTimezone: true }),
  finalNoticeAt: timestamp('final_notice_at', { withTimezone: true }),
  // Stripe
  stripePiDeposit: varchar('stripe_pi_deposit', { length: 255 }),
  stripePiBalance: varchar('stripe_pi_balance', { length: 255 }),
  // OB reconciliation
  obMatchedAt: timestamp('ob_matched_at', { withTimezone: true }),
  obTransactionId: varchar('ob_transaction_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => ({
  contractorIdIdx: index('jobs_contractor_id_idx').on(t.contractorId),
  statusIdx: index('jobs_status_idx').on(t.status),
  dueDateAtIdx: index('jobs_due_date_at_idx').on(t.dueDateAt),
}))

export const lineItems = pgTable('line_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).default('1'),
  unit: varchar('unit', { length: 30 }).default('item'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  category: varchar('category', { length: 20 }).default('labour'),
  isOptional: boolean('is_optional').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
})

export const jobPhotos = pgTable('job_photos', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  fileKey: text('file_key').notNull(),
  thumbKey: text('thumb_key'),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: integer('file_size'),
  caption: varchar('caption', { length: 255 }),
  photoType: varchar('photo_type', { length: 20 }).default('site'),
  isCover: boolean('is_cover').default(false),
  sortOrder: integer('sort_order').default(0),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).default(sql`now()`),
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  method: varchar('method', { length: 20 }),
  status: varchar('status', { length: 20 }).default('pending'),
  type: varchar('type', { length: 20 }).default('payment'),
  reference: varchar('reference', { length: 100 }),
  notes: text('notes'),
  stripePiId: varchar('stripe_pi_id', { length: 255 }),
  obTransactionId: varchar('ob_transaction_id', { length: 255 }),
  recordedBy: uuid('recorded_by').references(() => users.id),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => ({
  contractorIdIdx: index('payments_contractor_id_idx').on(t.contractorId),
  jobIdIdx: index('payments_job_id_idx').on(t.jobId),
}))

export const priceBook = pgTable('price_book', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  defaultQty: numeric('default_qty', { precision: 10, scale: 3 }).default('1'),
  unit: varchar('unit', { length: 30 }).default('item'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  category: varchar('category', { length: 20 }).default('labour'),
  tradeTag: varchar('trade_tag', { length: 50 }),
  isFavourite: boolean('is_favourite').default(false),
  useCount: integer('use_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').references(() => contractors.id),
  jobId: uuid('job_id').references(() => jobs.id),
  customerId: uuid('customer_id').references(() => customers.id),
  type: varchar('type', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 20 }).default('in_app'),
  status: varchar('status', { length: 20 }).default('pending'),
  title: text('title'),
  body: text('body'),
  actionUrl: text('action_url'),
  readAt: timestamp('read_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
})

export const obTransactions = pgTable('ob_transactions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 20 }),
  externalId: varchar('external_id', { length: 255 }).unique(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('GBP'),
  description: text('description'),
  merchantName: varchar('merchant_name', { length: 255 }),
  category: varchar('category', { length: 50 }),
  status: varchar('status', { length: 20 }),
  matchedJobId: uuid('matched_job_id').references(() => jobs.id),
  matchConfidence: numeric('match_confidence', { precision: 4, scale: 3 }),
  matchMethod: varchar('match_method', { length: 30 }),
  transactionAt: timestamp('transaction_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
})

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  contractorId: uuid('contractor_id').references(() => contractors.id),
  actorId: uuid('actor_id'),
  actorEmail: varchar('actor_email', { length: 255 }),
  actorIp: varchar('actor_ip', { length: 45 }),
  actorUa: text('actor_ua'),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: uuid('resource_id'),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
})

// ─── Contact Log ──────────────────────────────────────────────────────────────
// Tracks every real-world chasing interaction the contractor makes.
// Reflects how tradespeople ACTUALLY collect: phone calls, text messages, site visits.
// Not automated — logged manually by the contractor.

export const contactLogs = pgTable('contact_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
  loggedBy: uuid('logged_by').references(() => users.id),
  type: contactLogTypeEnum('type').notNull(),
  note: text('note'),
  response: text('response'),
  outcome: contactOutcomeEnum('outcome'),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => ({
  jobIdIdx: index('contact_logs_job_id_idx').on(t.jobId),
  contractorIdIdx: index('contact_logs_contractor_id_idx').on(t.contractorId),
}))

// ─── Type exports ──────────────────────────────────────────────────────────────

export type Contractor = typeof contractors.$inferSelect
export type NewContractor = typeof contractors.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert
export type LineItem = typeof lineItems.$inferSelect
export type NewLineItem = typeof lineItems.$inferInsert
export type JobPhoto = typeof jobPhotos.$inferSelect
export type Payment = typeof payments.$inferSelect
export type PriceBookItem = typeof priceBook.$inferSelect
export type Notification = typeof notifications.$inferSelect
export type ObTransaction = typeof obTransactions.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
export type ContactLog = typeof contactLogs.$inferSelect
