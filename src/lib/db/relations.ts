import { relations } from 'drizzle-orm'
import {
  contractors,
  users,
  customers,
  jobs,
  lineItems,
  jobPhotos,
  payments,
  priceBook,
  notifications,
  obTransactions,
  auditLogs,
  contactLogs,
} from './schema'

export const contractorsRelations = relations(contractors, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  jobs: many(jobs),
  payments: many(payments),
  priceBook: many(priceBook),
  notifications: many(notifications),
  obTransactions: many(obTransactions),
  auditLogs: many(auditLogs),
  contactLogs: many(contactLogs),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  contractor: one(contractors, {
    fields: [users.contractorId],
    references: [contractors.id],
  }),
  uploadedPhotos: many(jobPhotos),
  recordedPayments: many(payments),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  contractor: one(contractors, {
    fields: [customers.contractorId],
    references: [contractors.id],
  }),
  jobs: many(jobs),
  payments: many(payments),
  notifications: many(notifications),
}))

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  contractor: one(contractors, {
    fields: [jobs.contractorId],
    references: [contractors.id],
  }),
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id],
  }),
  lineItems: many(lineItems),
  photos: many(jobPhotos),
  payments: many(payments),
  notifications: many(notifications),
  obTransactions: many(obTransactions),
  contactLogs: many(contactLogs),
}))

export const contactLogsRelations = relations(contactLogs, ({ one }) => ({
  job: one(jobs, {
    fields: [contactLogs.jobId],
    references: [jobs.id],
  }),
  contractor: one(contractors, {
    fields: [contactLogs.contractorId],
    references: [contractors.id],
  }),
  loggedBy: one(users, {
    fields: [contactLogs.loggedBy],
    references: [users.id],
  }),
}))

export const lineItemsRelations = relations(lineItems, ({ one }) => ({
  job: one(jobs, {
    fields: [lineItems.jobId],
    references: [jobs.id],
  }),
}))

export const jobPhotosRelations = relations(jobPhotos, ({ one }) => ({
  job: one(jobs, {
    fields: [jobPhotos.jobId],
    references: [jobs.id],
  }),
  uploadedBy: one(users, {
    fields: [jobPhotos.uploadedBy],
    references: [users.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  job: one(jobs, {
    fields: [payments.jobId],
    references: [jobs.id],
  }),
  contractor: one(contractors, {
    fields: [payments.contractorId],
    references: [contractors.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  recordedBy: one(users, {
    fields: [payments.recordedBy],
    references: [users.id],
  }),
}))

export const priceBookRelations = relations(priceBook, ({ one }) => ({
  contractor: one(contractors, {
    fields: [priceBook.contractorId],
    references: [contractors.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  contractor: one(contractors, {
    fields: [notifications.contractorId],
    references: [contractors.id],
  }),
  job: one(jobs, {
    fields: [notifications.jobId],
    references: [jobs.id],
  }),
  customer: one(customers, {
    fields: [notifications.customerId],
    references: [customers.id],
  }),
}))

export const obTransactionsRelations = relations(obTransactions, ({ one }) => ({
  contractor: one(contractors, {
    fields: [obTransactions.contractorId],
    references: [contractors.id],
  }),
  matchedJob: one(jobs, {
    fields: [obTransactions.matchedJobId],
    references: [jobs.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  contractor: one(contractors, {
    fields: [auditLogs.contractorId],
    references: [contractors.id],
  }),
}))
