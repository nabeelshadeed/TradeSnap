// UK reminder emails — references UK law only at firm/final stage.

import type { EmailOutput, ReminderStage, UkEmailContext } from './types'

// ---------------------------------------------------------------------------
// Shared HTML primitives
// ---------------------------------------------------------------------------

function htmlWrapper(body: string, preheader: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SnapTrade</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#f97316;padding:24px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">SnapTrade</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px 32px;color:#18181b;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                This email was sent by SnapTrade on behalf of your contractor. If you have a query about this invoice, please reply to this email or contact your contractor directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="background-color:#f97316;border-radius:6px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.1px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function bankDetailsBlock(ctx: UkEmailContext): string {
  if (!ctx.bankAccountNumber && !ctx.bankSortCode) return ''
  const name = ctx.bankAccountName ?? ctx.contractorName
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;background-color:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 10px 0;font-size:13px;font-weight:600;color:#3f3f46;text-transform:uppercase;letter-spacing:0.5px;">Bank Transfer Details</p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#71717a;padding:2px 0;width:120px;">Account name</td><td style="font-size:13px;color:#18181b;font-weight:500;">${name}</td></tr>
          ${ctx.bankSortCode ? `<tr><td style="font-size:13px;color:#71717a;padding:2px 0;">Sort code</td><td style="font-size:13px;color:#18181b;font-weight:500;">${ctx.bankSortCode}</td></tr>` : ''}
          ${ctx.bankAccountNumber ? `<tr><td style="font-size:13px;color:#71717a;padding:2px 0;">Account no.</td><td style="font-size:13px;color:#18181b;font-weight:500;">${ctx.bankAccountNumber}</td></tr>` : ''}
          ${ctx.invoiceRef ? `<tr><td style="font-size:13px;color:#71717a;padding:2px 0;">Reference</td><td style="font-size:13px;color:#18181b;font-weight:500;">${ctx.invoiceRef}</td></tr>` : ''}
        </table>
      </td>
    </tr>
  </table>`
}

function invoiceSummaryRow(label: string, value: string, bold = false): string {
  return `<tr>
    <td style="font-size:14px;color:#71717a;padding:5px 0;border-bottom:1px solid #f4f4f5;">${label}</td>
    <td style="font-size:14px;color:#18181b;padding:5px 0;border-bottom:1px solid #f4f4f5;text-align:right;${bold ? 'font-weight:700;' : ''}">${value}</td>
  </tr>`
}

function invoiceSummaryBlock(ctx: UkEmailContext, showTotal = false, totalLabel = 'Total due', totalValue?: string): string {
  const rows = [
    invoiceSummaryRow('Invoice number', ctx.invoiceNumber),
    invoiceSummaryRow('Invoice amount', ctx.amount),
    invoiceSummaryRow('Payment terms', ctx.paymentTerms),
    invoiceSummaryRow('Due date', ctx.dueDate),
  ]
  if (showTotal && totalValue) {
    rows.push(invoiceSummaryRow(totalLabel, totalValue, true))
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;border-top:1px solid #f4f4f5;">${rows.join('')}</table>`
}

// ---------------------------------------------------------------------------
// Initial invoice email
// ---------------------------------------------------------------------------

export function buildUkInvoiceEmail(ctx: UkEmailContext): EmailOutput {
  const subject = `Invoice ${ctx.invoiceNumber} — ${ctx.amount} due ${ctx.dueDate}`

  const body = `
    <p style="margin:0 0 16px 0;font-size:15px;color:#18181b;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Please find below your invoice from <strong>${ctx.contractorName}</strong>. Payment is due by <strong>${ctx.dueDate}</strong> (${ctx.paymentTerms}).</p>

    ${invoiceSummaryBlock(ctx)}

    ${ctaButton('Pay Online', ctx.payUrl)}

    <p style="margin:0 0 8px 0;font-size:14px;color:#52525b;">Alternatively, you can pay by bank transfer using the details below. Please use the invoice number as your payment reference.</p>

    ${bankDetailsBlock(ctx)}

    <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;">If you have any questions about this invoice, please get in touch at <a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a>.</p>
    <p style="margin:12px 0 0 0;font-size:14px;color:#52525b;">Thank you for your business.</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#18181b;font-weight:500;">${ctx.contractorName}</p>
  `

  return {
    subject,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} — ${ctx.amount} due ${ctx.dueDate}`),
    tone: 'friendly',
  }
}

// ---------------------------------------------------------------------------
// Reminder emails
// ---------------------------------------------------------------------------

export function buildUkReminderEmail(stage: ReminderStage, ctx: UkEmailContext): EmailOutput {
  switch (stage) {
    case 'pre_due':
      return buildPreDue(ctx)
    case 'day_after':
      return buildDayAfter(ctx)
    case '3_days':
      return build3Days(ctx)
    case '7_days':
      return build7Days(ctx)
    case '14_days':
      return build14Days(ctx)
  }
}

// pre_due — friendly, no pressure, no legal references
function buildPreDue(ctx: UkEmailContext): EmailOutput {
  const subject = `Reminder — Invoice ${ctx.invoiceNumber} due ${ctx.dueDate}`

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Just a quick reminder that invoice <strong>${ctx.invoiceNumber}</strong> for <strong>${ctx.amount}</strong> is due on <strong>${ctx.dueDate}</strong>.</p>
    <p style="margin:0 0 16px 0;">If you have already arranged payment, please ignore this message — and thank you.</p>

    ${invoiceSummaryBlock(ctx)}

    ${ctaButton('Pay Now', ctx.payUrl)}

    ${bankDetailsBlock(ctx)}

    <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;">Any questions? Reply to this email or reach us at <a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a>.</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#18181b;font-weight:500;">${ctx.contractorName}</p>
  `

  return {
    subject,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} for ${ctx.amount} is due on ${ctx.dueDate}.`),
    tone: 'friendly',
  }
}

// day_after — still friendly, assumes it may have been missed
function buildDayAfter(ctx: UkEmailContext): EmailOutput {
  const subject = `Invoice ${ctx.invoiceNumber} — just checking in`

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Just a friendly note — invoice <strong>${ctx.invoiceNumber}</strong> for <strong>${ctx.amount}</strong> was due yesterday. It may have slipped through the net, so we wanted to give you a quick heads-up.</p>
    <p style="margin:0 0 16px 0;">If payment is already on its way, thank you — please ignore this message.</p>

    ${invoiceSummaryBlock(ctx)}

    ${ctaButton('Pay Now', ctx.payUrl)}

    ${bankDetailsBlock(ctx)}

    <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;">If you have any questions, please don't hesitate to get in touch at <a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a>.</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#18181b;font-weight:500;">${ctx.contractorName}</p>
  `

  return {
    subject,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} for ${ctx.amount} was due yesterday.`),
    tone: 'friendly',
  }
}

// 3_days — polite but direct, no legal references
function build3Days(ctx: UkEmailContext): EmailOutput {
  const subject = `Invoice ${ctx.invoiceNumber} — could you let us know when to expect payment?`

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Invoice <strong>${ctx.invoiceNumber}</strong> for <strong>${ctx.amount}</strong> is now 3 days overdue (due date: ${ctx.dueDate}). We haven't yet received payment or a response regarding this invoice.</p>
    <p style="margin:0 0 16px 0;">Could you let us know when we can expect payment, or whether there is anything we can help to resolve? We'd appreciate a quick reply either way.</p>

    ${invoiceSummaryBlock(ctx)}

    ${ctaButton('Pay Now', ctx.payUrl)}

    ${bankDetailsBlock(ctx)}

    <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;">Please reply to this email or contact us at <a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a>.</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#18181b;font-weight:500;">${ctx.contractorName}</p>
  `

  return {
    subject,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} is 3 days overdue. Please let us know your expected payment date.`),
    tone: 'friendly',
  }
}

// 7_days — firm; first mention of statutory interest, brief
function build7Days(ctx: UkEmailContext): EmailOutput {
  const subject = `Invoice ${ctx.invoiceNumber} now 7 days overdue`

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">We are writing to advise that invoice <strong>${ctx.invoiceNumber}</strong> for <strong>${ctx.amount}</strong> remains unpaid and is now <strong>7 days overdue</strong> (due date: ${ctx.dueDate}).</p>
    <p style="margin:0 0 16px 0;">We ask that you arrange payment in full without further delay. Please note that statutory interest is beginning to accrue on this debt under the Late Payment of Commercial Debts (Interest) Act 1998.</p>
    <p style="margin:0 0 16px 0;">If there is a dispute or issue with this invoice, please contact us immediately so we can resolve it.</p>

    ${invoiceSummaryBlock(ctx)}

    ${ctaButton('Pay Now', ctx.payUrl)}

    ${bankDetailsBlock(ctx)}

    <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;">To discuss this invoice, please contact us at <a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a>.</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#18181b;font-weight:500;">${ctx.contractorName}</p>
  `

  return {
    subject,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} is 7 days overdue. Please arrange payment immediately.`),
    tone: 'firm',
  }
}

// 14_days — formal notice; full statutory calculation, fixed compensation, 7-day deadline
function build14Days(ctx: UkEmailContext): EmailOutput {
  const subject = `Formal notice — Invoice ${ctx.invoiceNumber} + statutory interest`

  const hasInterestData = ctx.statutoryInterest && ctx.fixedCompensation

  const interestBlock = hasInterestData
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;background-color:#fef2f2;border-radius:6px;border:1px solid #fecaca;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 10px 0;font-size:13px;font-weight:600;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">Statutory Charges Accrued</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="font-size:13px;color:#7f1d1d;padding:3px 0;">Invoice amount</td><td style="font-size:13px;color:#18181b;text-align:right;">${ctx.amount}</td></tr>
              <tr><td style="font-size:13px;color:#7f1d1d;padding:3px 0;">Statutory interest accrued</td><td style="font-size:13px;color:#18181b;text-align:right;">${ctx.statutoryInterest}</td></tr>
              <tr><td style="font-size:13px;color:#7f1d1d;padding:3px 0;">Fixed compensation</td><td style="font-size:13px;color:#18181b;text-align:right;">${ctx.fixedCompensation}</td></tr>
            </table>
          </td>
        </tr>
      </table>`
    : ''

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">This is a formal notice that invoice <strong>${ctx.invoiceNumber}</strong> for <strong>${ctx.amount}</strong>, which was due on <strong>${ctx.dueDate}</strong>, remains unpaid and is now <strong>${ctx.daysLate} days overdue</strong>.</p>
    <p style="margin:0 0 16px 0;">Under the <strong>Late Payment of Commercial Debts (Interest) Act 1998</strong>, we are entitled to charge statutory interest at 8% above the Bank of England base rate per annum on the outstanding balance, as well as a fixed compensation amount to cover recovery costs.</p>
    ${hasInterestData ? `<p style="margin:0 0 16px 0;">The following charges have accrued to date:</p>${interestBlock}` : ''}
    <p style="margin:24px 0 16px 0;">We require payment of the full outstanding balance within <strong>7 days</strong> of the date of this notice. If payment is not received by that date, we will take further action to recover the debt, which may include instructing a debt recovery service.</p>
    <p style="margin:0 0 16px 0;">If you believe there is a genuine dispute with this invoice, you must contact us in writing immediately.</p>

    ${invoiceSummaryBlock(ctx)}

    ${ctaButton('Pay Now', ctx.payUrl)}

    ${bankDetailsBlock(ctx)}

    <p style="margin:24px 0 0 0;font-size:14px;color:#52525b;">Please direct all correspondence regarding this matter to <a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a>.</p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#18181b;font-weight:500;">${ctx.contractorName}</p>
  `

  return {
    subject,
    html: htmlWrapper(body, `Formal notice: Invoice ${ctx.invoiceNumber} is ${ctx.daysLate} days overdue. Payment required within 7 days.`),
    tone: 'final',
  }
}
