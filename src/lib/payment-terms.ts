export type PaymentTermsType = 'net7' | 'net14' | 'net30' | 'net60' | 'custom'

export const TERMS_DAYS: Record<Exclude<PaymentTermsType, 'custom'>, number> = {
  net7: 7,
  net14: 14,
  net30: 30,
  net60: 60,
}

export function getTermsDays(type: PaymentTermsType, customDays?: number): number {
  if (type === 'custom') return customDays ?? 30
  return TERMS_DAYS[type]
}

export function getTermsLabel(type: PaymentTermsType, customDays?: number): string {
  if (type === 'custom') return `Custom (${customDays ?? 30} days)`
  const labels: Record<Exclude<PaymentTermsType, 'custom'>, string> = {
    net7: 'Net 7',
    net14: 'Net 14',
    net30: 'Net 30',
    net60: 'Net 60',
  }
  return labels[type]
}

/**
 * Returns the default payment terms type for a country.
 * UK: net30 (Late Payment Act 1998 statutory default)
 * US: throws — US contractors must always specify terms explicitly
 */
export function getDefaultTerms(operatingCountry: 'UK' | 'US'): PaymentTermsType {
  if (operatingCountry === 'US') {
    throw new Error(
      'US contractors must specify explicit payment terms. No default is assumed.',
    )
  }
  return 'net30'
}

export function validateTermsForCountry(
  operatingCountry: 'UK' | 'US',
  termsType: PaymentTermsType | null | undefined,
): { valid: boolean; error?: string } {
  if (operatingCountry === 'US' && !termsType) {
    return {
      valid: false,
      error: 'Payment terms are required for US contractors. Specify net7, net14, net30, net60, or custom.',
    }
  }
  return { valid: true }
}

/**
 * Returns a full human sentence for display on quotes and invoices.
 * UK phrasing matches statutory convention.
 * US phrasing references the agreed contract terms.
 */
export function buildTermsDisplay(
  type: PaymentTermsType,
  customDays?: number,
  operatingCountry: 'UK' | 'US' = 'UK',
): string {
  const days = getTermsDays(type, customDays)
  const label = getTermsLabel(type, customDays)

  if (operatingCountry === 'UK') {
    return `Payment is due within ${days} days of invoice date (${label}).`
  }
  return `Payment due ${label} from invoice date. Per our agreement, payment is expected within ${days} days.`
}
