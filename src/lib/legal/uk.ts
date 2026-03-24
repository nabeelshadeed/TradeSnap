// UK ONLY — Late Payment of Commercial Debts (Interest) Act 1998
// Do NOT use this module for US contractors.

import type { Job } from '@/lib/db/schema'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UkLegalResult {
  /** Annual interest rate applied (bankBaseRate + 8%) */
  interestRate: number
  /** Interest accrued per day in GBP */
  dailyRate: number
  /** Number of calendar days the invoice is overdue */
  daysOverdue: number
  /** Total statutory interest accrued in GBP */
  interest: number
  /**
   * Fixed compensation under s.5A of the Act:
   *   < £1,000  → £40
   *   £1,000–£9,999 → £70
   *   ≥ £10,000 → £100
   */
  fixedCompensation: 40 | 70 | 100
  /** interest + fixedCompensation */
  totalClaim: number
}

export type EscalationStage = 'firm_notice' | 'final_notice'

export interface UkTradeTerms {
  tradeType: string
  paymentDays: number
  terms: string
}

export interface UkB2BEligibility {
  eligible: boolean
  reason: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Current Bank of England base rate as at the time of writing.
 * This is parameterised throughout — callers should pass the live rate
 * when precision matters.
 */
const DEFAULT_BOE_BASE_RATE = 5.25

/** Statutory interest premium under the Late Payment Act 1998, s.6 */
const STATUTORY_PREMIUM = 8

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Calculates statutory interest and fixed compensation under the
 * Late Payment of Commercial Debts (Interest) Act 1998.
 *
 * Interest runs from the day after the payment due date.
 * Fixed compensation is a one-off amount per debt, not per day.
 *
 * @param invoiceAmount  - The outstanding invoice amount in GBP (exc. VAT)
 * @param dueDateISO     - The payment due date in ISO 8601 format (YYYY-MM-DD or full ISO)
 * @param todayISO       - The reference date for calculation (defaults to now)
 * @param bankBaseRate   - Bank of England base rate in percent (defaults to 5.25%)
 */
export function calculateStatutoryInterest(
  invoiceAmount: number,
  dueDateISO: string,
  todayISO: string = new Date().toISOString(),
  bankBaseRate: number = DEFAULT_BOE_BASE_RATE,
): UkLegalResult {
  const interestRate = bankBaseRate + STATUTORY_PREMIUM

  const dueDate = new Date(dueDateISO)
  const today = new Date(todayISO)
  const diffMs = today.getTime() - dueDate.getTime()
  // Interest begins the day after the due date — max(0, ...) prevents negative values
  const daysOverdue = Math.max(0, Math.floor(diffMs / 86_400_000))

  const dailyRate = (invoiceAmount * (interestRate / 100)) / 365
  const interest = dailyRate * daysOverdue

  let fixedCompensation: 40 | 70 | 100
  if (invoiceAmount >= 10_000) {
    fixedCompensation = 100
  } else if (invoiceAmount >= 1_000) {
    fixedCompensation = 70
  } else {
    fixedCompensation = 40
  }

  const totalClaim = interest + fixedCompensation

  return {
    interestRate,
    dailyRate: Math.round(dailyRate * 100) / 100,
    daysOverdue,
    interest: Math.round(interest * 100) / 100,
    fixedCompensation,
    totalClaim: Math.round(totalClaim * 100) / 100,
  }
}

/**
 * Returns the UK statutory default payment period under the Late Payment Act.
 * 30 days applies where no payment terms have been expressly agreed.
 */
export function getDefaultPaymentDays(): 30 {
  return 30
}

/**
 * Returns trade-specific payment terms text incorporating the relevant
 * UK statutory or industry standard reference for each trade type.
 *
 * The returned string is suitable for use in quotes, invoices, and notices.
 *
 * @param tradeType    - The contractor's trade (matches tradeTypeEnum values)
 * @param paymentDays  - The agreed payment period in days
 */
export function getUkTradeTerms(tradeType: string, paymentDays: number): string {
  const due = `Payment is due within ${paymentDays} days of invoice date.`
  const latePaymentClause =
    `We reserve the right to charge statutory interest on overdue invoices at ${STATUTORY_PREMIUM}% above ` +
    `the Bank of England base rate per annum under the Late Payment of Commercial Debts (Interest) Act 1998. ` +
    `Fixed compensation may also be applied to cover debt recovery costs.`

  const tradeSpecific: Record<string, string> = {
    electrician:
      `All electrical work is carried out in accordance with BS 7671 18th Edition IET Wiring Regulations. ` +
      `An Electrical Installation Certificate will be issued upon completion of all notifiable work. ` +
      `${due} ${latePaymentClause}`,

    'gas-engineer':
      `All gas work is carried out by a Gas Safe Registered engineer (Gas Safe Registration No: [your number]). ` +
      `Landlord Gas Safety Records (CP12) are issued where required. ` +
      `${due} ${latePaymentClause}`,

    plumber:
      `All plumbing work is carried out in accordance with the Water Supply (Water Fittings) Regulations 1999. ` +
      `${due} ${latePaymentClause}`,

    roofer:
      `All roofing work is carried out in accordance with BS 5534: Code of Practice for Slating and Tiling. ` +
      `${due} ${latePaymentClause}`,

    hvac:
      `All HVAC work is carried out by F-Gas certified engineers in accordance with EU 517/2014 (retained in UK law). ` +
      `${due} ${latePaymentClause}`,

    carpenter:
      `All joinery and carpentry work is carried out to a professional standard. ` +
      `${due} ${latePaymentClause}`,

    painter:
      `All painting and decorating work is carried out in accordance with industry best practice. ` +
      `${due} ${latePaymentClause}`,

    tiler:
      `All tiling work is carried out in accordance with BS 5385 Wall and Floor Tiling standards. ` +
      `${due} ${latePaymentClause}`,

    landscaper:
      `All landscaping work is carried out to a professional standard. ` +
      `${due} ${latePaymentClause}`,

    'general-builder':
      `All building work is carried out in accordance with the Building Regulations 2010 where applicable. ` +
      `${due} ${latePaymentClause}`,
  }

  return tradeSpecific[tradeType] ?? `Work is carried out to a professional standard. ${due} ${latePaymentClause}`
}

/**
 * Determines whether the Late Payment of Commercial Debts Act 1998 can be applied.
 *
 * The Act applies ONLY to B2B (business-to-business) transactions.
 * It does NOT apply to consumer (residential) contracts.
 *
 * @param isB2B - Pass true only if the customer is a business, not a private individual
 */
export function canApplyStatutoryInterest(isB2B: boolean): UkB2BEligibility {
  if (isB2B) {
    return {
      eligible: true,
      reason:
        'Transaction is B2B. Statutory interest under the Late Payment of Commercial Debts ' +
        '(Interest) Act 1998 applies.',
    }
  }

  return {
    eligible: false,
    reason:
      'Transaction is B2C (residential/consumer). The Late Payment of Commercial Debts ' +
      '(Interest) Act 1998 does not apply to consumer contracts. Pursue through standard ' +
      'contractual terms or small claims court instead.',
  }
}

/**
 * Generates the full text of a legal escalation notice for firm or final demand letters.
 *
 * These letters are designed to be sent after the informal reminder stage has failed
 * and the contractor is exercising their statutory rights.
 *
 * @param stage          - 'firm_notice' (first formal demand) or 'final_notice' (pre-legal)
 * @param job            - The job record from the database
 * @param interestResult - Output from calculateStatutoryInterest()
 */
export function buildEscalationNotice(
  stage: EscalationStage,
  job: Pick<
    Job,
    | 'title'
    | 'invoiceNumber'
    | 'total'
    | 'dueDate'
    | 'signerName'
    | 'customerNotes'
  >,
  interestResult: UkLegalResult,
): string {
  const invoiceRef = job.invoiceNumber ?? 'N/A'
  const invoiceTotal = Number(job.total ?? 0).toFixed(2)
  const dueDate = job.dueDate ?? 'the agreed due date'
  const addressee = job.signerName ?? 'Sir/Madam'

  const totalOwed = (Number(job.total ?? 0) + interestResult.totalClaim).toFixed(2)

  if (stage === 'firm_notice') {
    return `
FORMAL NOTICE OF OVERDUE PAYMENT

Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}

Dear ${addressee},

RE: Invoice ${invoiceRef} — ${job.title}

Despite our previous reminders, the sum of £${invoiceTotal} remains outstanding as at today's date. This invoice was due for payment on ${dueDate}.

We write formally to demand payment of the outstanding balance, together with statutory interest and compensation under the Late Payment of Commercial Debts (Interest) Act 1998.

AMOUNT DUE

  Original invoice amount:   £${invoiceTotal}
  Statutory interest accrued: £${interestResult.interest.toFixed(2)}
  (${interestResult.interestRate}% per annum for ${interestResult.daysOverdue} days)
  Fixed debt recovery compensation: £${interestResult.fixedCompensation.toFixed(2)}

  TOTAL NOW DUE:             £${totalOwed}

Interest continues to accrue at £${interestResult.dailyRate.toFixed(2)} per day until the date of payment.

You are required to settle the full amount within 7 days of the date of this notice. Payment should be made by bank transfer to the account details shown on the original invoice.

If we do not receive payment within 7 days, we will take further action to recover the debt without further notice. This may include referral to a debt collection agency or proceedings in the County Court.

Yours faithfully,

[Contractor Name]
[Contractor Address]
[Contractor Phone / Email]
`.trim()
  }

  // stage === 'final_notice'
  return `
FINAL NOTICE — LETTER BEFORE ACTION

Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}

Dear ${addressee},

RE: Invoice ${invoiceRef} — ${job.title} — FINAL DEMAND

This is our final notice before we commence legal proceedings to recover the debt.

Despite our firm notice dated previously, the sum below remains unpaid. We have now exhausted all reasonable attempts to resolve this matter informally.

TOTAL NOW DUE

  Original invoice amount:         £${invoiceTotal}
  Statutory interest accrued:       £${interestResult.interest.toFixed(2)}
  (${interestResult.interestRate}% per annum for ${interestResult.daysOverdue} days)
  Fixed debt recovery compensation: £${interestResult.fixedCompensation.toFixed(2)}

  TOTAL OUTSTANDING:               £${totalOwed}

Interest continues to accrue at £${interestResult.dailyRate.toFixed(2)} per day.

NOTICE OF INTENTION TO ISSUE PROCEEDINGS

Unless we receive full payment of £${totalOwed} within 7 days of the date of this letter, we will, without further notice, issue a claim in the County Court (or Money Claim Online) for the full outstanding balance plus court fees and any additional costs incurred.

This letter constitutes formal pre-action notice as required under the Pre-Action Protocol for Debt Claims.

Yours faithfully,

[Contractor Name]
[Contractor Address]
[Contractor Phone / Email]
`.trim()
}
