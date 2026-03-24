// US reminder emails — NO legal references. Enforcement via contract terms only.
// NEVER use the words: statutory, interest rate, act, statute, law, legal action, court.
// Reference only: agreed terms, professionalism, business relationship.

import type { EmailOutput, ReminderStage, UsEmailContext } from './types'

// ─── Shared HTML primitives ────────────────────────────────────────────────────

function htmlWrapper(body: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#f97316;padding:24px 32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;">SnapTrade</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px 32px;color:#18181b;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                This message was sent on behalf of your contractor via SnapTrade. To update your payment details or dispute this invoice, reply directly to this email.
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
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`
}

function invoiceBlock(ctx: UsEmailContext): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fafafa;border-radius:6px;padding:16px 20px;margin:20px 0;">
    <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px;">INVOICE DETAILS</td></tr>
    <tr><td style="font-size:14px;color:#18181b;padding:2px 0;"><strong>Invoice:</strong> ${ctx.invoiceNumber}</td></tr>
    <tr><td style="font-size:14px;color:#18181b;padding:2px 0;"><strong>Amount due:</strong> ${ctx.amount}</td></tr>
    <tr><td style="font-size:14px;color:#18181b;padding:2px 0;"><strong>Terms:</strong> ${ctx.paymentTerms}</td></tr>
    <tr><td style="font-size:14px;color:#18181b;padding:2px 0;"><strong>Due date:</strong> ${ctx.dueDate}</td></tr>
    ${ctx.lateFeeAmount ? `<tr><td style="font-size:13px;color:#b45309;padding-top:8px;">Late fee (per agreement): ${ctx.lateFeeAmount}</td></tr>` : ''}
  </table>`
}

// ─── Invoice email ─────────────────────────────────────────────────────────────

export function buildUsInvoiceEmail(ctx: UsEmailContext): EmailOutput {
  const lateFeeNote = ctx.lateFeeClause
    ? `<p style="font-size:13px;color:#71717a;margin:0 0 16px 0;">Per our agreement: ${ctx.lateFeeClause}</p>`
    : ''

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Thank you for the opportunity to work with you. Please find your invoice details below.</p>
    ${invoiceBlock(ctx)}
    ${lateFeeNote}
    ${ctaButton('Pay Invoice', ctx.payUrl)}
    <p style="margin:16px 0 0 0;font-size:14px;color:#52525b;">If you have any questions about this invoice, please reply to this email or contact us at <a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a>.</p>
    <p style="margin:20px 0 0 0;">Thanks,<br/><strong>${ctx.contractorName}</strong></p>`

  return {
    subject: `Invoice ${ctx.invoiceNumber} — ${ctx.amount} due ${ctx.dueDate}`,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} for ${ctx.amount} due ${ctx.dueDate}`),
    tone: 'friendly',
  }
}

// ─── Reminder emails ───────────────────────────────────────────────────────────

export function buildUsReminderEmail(stage: ReminderStage, ctx: UsEmailContext): EmailOutput {
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

function buildPreDue(ctx: UsEmailContext): EmailOutput {
  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Just a quick heads-up — invoice ${ctx.invoiceNumber} for <strong>${ctx.amount}</strong> is due on <strong>${ctx.dueDate}</strong>.</p>
    ${invoiceBlock(ctx)}
    ${ctaButton('Pay Invoice', ctx.payUrl)}
    <p style="margin:16px 0 0 0;">Thanks for your business,<br/><strong>${ctx.contractorName}</strong></p>`

  return {
    subject: `Upcoming payment reminder — Invoice ${ctx.invoiceNumber}`,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} due ${ctx.dueDate}`),
    tone: 'friendly',
  }
}

function buildDayAfter(ctx: UsEmailContext): EmailOutput {
  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Just checking in — invoice ${ctx.invoiceNumber} for <strong>${ctx.amount}</strong> was due yesterday. It may have been an oversight on your end or ours — we just wanted to make sure it reached you.</p>
    ${invoiceBlock(ctx)}
    ${ctaButton('Pay Invoice', ctx.payUrl)}
    <p style="margin:16px 0 0 0;">If you've already sent payment, please disregard this message. Otherwise, we'd appreciate hearing from you.</p>
    <p style="margin:16px 0 0 0;">Thanks,<br/><strong>${ctx.contractorName}</strong></p>`

  return {
    subject: `Quick follow-up on Invoice ${ctx.invoiceNumber}`,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} — just checking in`),
    tone: 'friendly',
  }
}

function build3Days(ctx: UsEmailContext): EmailOutput {
  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Following up on invoice ${ctx.invoiceNumber} for <strong>${ctx.amount}</strong>, which was due ${ctx.daysLate} days ago per our agreed ${ctx.paymentTerms} terms.</p>
    ${invoiceBlock(ctx)}
    ${ctaButton('Pay Now', ctx.payUrl)}
    <p style="margin:16px 0 0 0;">Could you let us know when to expect payment, or if there's anything we need to clarify on the invoice?</p>
    <p style="margin:16px 0 0 0;">Thanks,<br/><strong>${ctx.contractorName}</strong></p>`

  return {
    subject: `Invoice ${ctx.invoiceNumber} — quick follow-up`,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} — ${ctx.daysLate} days past due`),
    tone: 'friendly',
  }
}

function build7Days(ctx: UsEmailContext): EmailOutput {
  const lateFeeSection = ctx.lateFeeAmount
    ? `<p style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-radius:4px;font-size:14px;color:#92400e;">Per our agreement, a late fee of <strong>${ctx.lateFeeAmount}</strong> has been applied to this invoice.</p>`
    : ''

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">Invoice ${ctx.invoiceNumber} for <strong>${ctx.amount}</strong> is now <strong>${ctx.daysLate} days past due</strong> per our agreed ${ctx.paymentTerms} terms.</p>
    ${invoiceBlock(ctx)}
    ${lateFeeSection}
    ${ctaButton('Pay Now', ctx.payUrl)}
    <p style="margin:16px 0 0 0;">We value our working relationship and want to resolve this promptly. Please arrange payment at your earliest convenience, or reach out if there is an issue with the invoice.</p>
    <p style="margin:16px 0 0 0;">Thanks,<br/><strong>${ctx.contractorName}</strong><br/><a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a></p>`

  return {
    subject: `Invoice ${ctx.invoiceNumber} — ${ctx.daysLate} days past due`,
    html: htmlWrapper(body, `Invoice ${ctx.invoiceNumber} — action needed`),
    tone: 'firm',
  }
}

function build14Days(ctx: UsEmailContext): EmailOutput {
  const lateFeeSection = ctx.lateFeeAmount
    ? `<p style="margin:16px 0;padding:12px 16px;background:#fee2e2;border-radius:4px;font-size:14px;color:#991b1b;">Per our agreement, a late fee of <strong>${ctx.lateFeeAmount}</strong> is included in the total due.</p>`
    : ''

  const body = `
    <p style="margin:0 0 16px 0;">Hi ${ctx.customerFirstName},</p>
    <p style="margin:0 0 16px 0;">This is our final notice regarding invoice ${ctx.invoiceNumber} for <strong>${ctx.amount}</strong>, which is now <strong>${ctx.daysLate} days overdue</strong>.</p>
    ${invoiceBlock(ctx)}
    ${lateFeeSection}
    ${ctaButton('Resolve Now', ctx.payUrl)}
    <p style="margin:16px 0 0 0;">We have made several attempts to reach you regarding this invoice. If full payment is not received within 7 days, we may need to reconsider our working relationship and escalate this matter internally.</p>
    <p style="margin:16px 0 0 0;">If you are experiencing difficulties, please contact us directly — we are open to discussing a payment plan.</p>
    <p style="margin:20px 0 0 0;"><strong>${ctx.contractorName}</strong><br/><a href="mailto:${ctx.contractorEmail}" style="color:#f97316;">${ctx.contractorEmail}</a></p>`

  return {
    subject: `Final notice — Invoice ${ctx.invoiceNumber} (${ctx.daysLate} days overdue)`,
    html: htmlWrapper(body, `Final notice: Invoice ${ctx.invoiceNumber}`),
    tone: 'final',
  }
}
