// Country-agnostic invoice email router.
// Routes to UK or US builder based on contractor's operating country.

import { buildUkInvoiceEmail } from './uk-reminders'
import { buildUsInvoiceEmail } from './us-reminders'
import type { EmailOutput, UkEmailContext, UsEmailContext } from './types'

export function buildInvoiceEmail(
  country: 'UK' | 'US',
  ctx: UkEmailContext | UsEmailContext,
): EmailOutput {
  if (country === 'UK') {
    return buildUkInvoiceEmail(ctx as UkEmailContext)
  }
  return buildUsInvoiceEmail(ctx as UsEmailContext)
}
