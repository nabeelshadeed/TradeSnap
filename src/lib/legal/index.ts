// Legal engine router — selects UK or US logic based on contractor.operatingCountry.
// HARD RULE: UK and US enforcement logic must never share a code path.

export * as UK from './uk'
export * as US from './us'

export type OperatingCountry = 'UK' | 'US'
export type LegalMode = 'statutory' | 'contract_only'

export function getLegalMode(operatingCountry: OperatingCountry): LegalMode {
  return operatingCountry === 'UK' ? 'statutory' : 'contract_only'
}

/**
 * Hard guard: throws a descriptive error if a country-specific function is called
 * for the wrong country. Use this at the top of any country-specific logic.
 *
 * @example
 * assertCountry(contractor.operatingCountry, 'UK', 'calculateStatutoryInterest')
 */
export function assertCountry(
  actual: OperatingCountry,
  expected: OperatingCountry,
  context: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `[Legal Engine] "${context}" is a ${expected}-only function but was called for a ${actual} contractor. ` +
        `This is a legal error — ${expected === 'UK' ? 'statutory interest' : 'contract-only'} logic ` +
        `cannot be applied to ${actual} contractors.`,
    )
  }
}

/**
 * Returns the correct payment terms days for a given country and terms type.
 * UK: defaults to 30 days if terms not specified (statutory default).
 * US: throws if no terms specified — no assumption is ever made.
 */
export function getPaymentTermsDays(
  operatingCountry: OperatingCountry,
  termsType: string | null | undefined,
  customDays?: number,
): number {
  if (!termsType) {
    if (operatingCountry === 'UK') return 30 // UK statutory default
    throw new Error(
      '[Legal Engine] US contractors must specify explicit payment terms. ' +
        'No default payment period is assumed in the US.',
    )
  }

  const map: Record<string, number> = { net7: 7, net14: 14, net30: 30, net60: 60 }
  if (termsType === 'custom') return customDays ?? 30
  return map[termsType] ?? (operatingCountry === 'UK' ? 30 : (() => { throw new Error(`Unknown terms type: ${termsType}`) })())
}

/**
 * Returns the default payment period for a country.
 * UK: 30 days (Late Payment Act 1998 s.4(2A))
 * US: null — must be explicitly set
 */
export function getDefaultTermsDays(operatingCountry: OperatingCountry): number | null {
  return operatingCountry === 'UK' ? 30 : null
}
