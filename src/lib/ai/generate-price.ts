import Anthropic from '@anthropic-ai/sdk'

export interface GeneratedLineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  category: 'labour' | 'materials' | 'other'
  isOptional: boolean
}

export interface GeneratedPrice {
  jobTitle: string
  lineItems: GeneratedLineItem[]
  subtotal: number
  taxLabel: 'VAT' | 'Tax' | null
  taxRate: number | null
  taxAmount: number | null
  total: number
  depositPercent: number
  paymentTermsDays: number
  paymentTermsClause: string
  lateFeeClause: string | null
  estimatedDays: number
  notIncluded: string
  customerNotes: string
  internalNotes: string
}

export interface GeneratePriceInput {
  transcript: string
  tradeType: string
  hourlyRate: number
  country: 'UK' | 'US'
  state?: string
  isVatRegistered?: boolean
  vatRate?: number
  defaultLateFeeType?: string
  defaultLateFeeAmount?: number
  defaultPaymentTerms?: string
}

function buildUkSystemPrompt(input: GeneratePriceInput): string {
  const vatRate = input.vatRate ?? 20
  const paymentDays = parsePaymentTermsDays(input.defaultPaymentTerms) ?? 30
  const currencySymbol = '£'

  const vatSection = input.isVatRegistered
    ? `VAT INSTRUCTIONS:
- The contractor is VAT-registered. You MUST include VAT as a separate line in the response.
- taxLabel must be "VAT"
- taxRate must be ${vatRate}
- taxAmount must be (subtotal * ${vatRate} / 100), rounded to 2 decimal places
- total must equal subtotal + taxAmount
- In customerNotes, mention that prices are shown exclusive of VAT and that VAT at ${vatRate}% will be added.`
    : `VAT INSTRUCTIONS:
- The contractor is NOT VAT-registered. Do not include any VAT.
- taxLabel must be null, taxRate must be null, taxAmount must be null
- total must equal subtotal exactly`

  return `You are an expert ${input.tradeType} contractor operating in the United Kingdom. Extract a precise, professional price breakdown from the site notes provided. The contractor's hourly rate is ${currencySymbol}${input.hourlyRate}.

${vatSection}

PAYMENT TERMS:
- Payment terms are ${paymentDays} days from invoice date (Net ${paymentDays}).
- paymentTermsDays must be ${paymentDays}
- paymentTermsClause must be: "Payment is due within ${paymentDays} days of invoice date."
- The customerNotes field MUST contain this exact phrase: "Payment terms: ${paymentDays} days from invoice date. Statutory interest may apply to late payments."
- lateFeeClause must be null — do NOT include any US-style late fee language.

LEGAL:
- This is a UK job. Do NOT include any US-specific language, state law references, or US dollar amounts.
- Do NOT reference any US late payment statutes.

CURRENCY:
- All monetary amounts must be in GBP (pound sterling). Do not use dollar signs.

OUTPUT:
Return ONLY valid JSON with no markdown fences, no commentary. The JSON must match this exact structure:
{
  "jobTitle": "string — concise title for the job",
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unit": "string (e.g. hours, m2, item, day)",
      "unitPrice": number,
      "category": "labour" | "materials" | "other",
      "isOptional": boolean
    }
  ],
  "subtotal": number,
  "taxLabel": "VAT" | null,
  "taxRate": number | null,
  "taxAmount": number | null,
  "total": number,
  "depositPercent": number (0–50, suggest 25 for most jobs),
  "paymentTermsDays": ${paymentDays},
  "paymentTermsClause": "string",
  "lateFeeClause": null,
  "estimatedDays": number,
  "notIncluded": "string — what is explicitly excluded from this quote",
  "customerNotes": "string — must include the statutory interest phrase",
  "internalNotes": "string — notes for contractor eyes only, e.g. risk, material lead times"
}`
}

function buildUsSystemPrompt(input: GeneratePriceInput): string {
  const paymentDays = parsePaymentTermsDays(input.defaultPaymentTerms) ?? 30
  const paymentTermsLabel = input.defaultPaymentTerms?.toUpperCase() ?? `NET ${paymentDays}`
  const stateNote = input.state ? ` The contractor operates in ${input.state}.` : ''
  const currencySymbol = '$'

  let lateFeeInstruction: string
  let lateFeeClauseExample: string

  if (input.defaultLateFeeType === 'percent' && input.defaultLateFeeAmount != null) {
    const rate = input.defaultLateFeeAmount
    lateFeeInstruction = `LATE FEE:
- A percentage-based late fee applies, per the contractor's standard agreement.
- lateFeeClause must be: "A late payment fee of ${rate}% per month applies to overdue balances, per our agreement."`
    lateFeeClauseExample = `"A late payment fee of ${rate}% per month applies to overdue balances, per our agreement."`
  } else if (input.defaultLateFeeType === 'fixed' && input.defaultLateFeeAmount != null) {
    const amount = input.defaultLateFeeAmount
    lateFeeInstruction = `LATE FEE:
- A fixed late fee applies, per the contractor's standard agreement.
- lateFeeClause must be: "A late payment fee of ${currencySymbol}${amount} applies to invoices unpaid after ${paymentDays} days, per our agreement."`
    lateFeeClauseExample = `"A late payment fee of ${currencySymbol}${amount} applies to invoices unpaid after ${paymentDays} days, per our agreement."`
  } else {
    lateFeeInstruction = `LATE FEE:
- No late fee clause applies. lateFeeClause must be null.`
    lateFeeClauseExample = 'null'
  }

  return `You are an expert ${input.tradeType} contractor operating in the United States.${stateNote} Extract a precise, professional price breakdown from the site notes provided. The contractor's hourly rate is ${currencySymbol}${input.hourlyRate}.

TAX INSTRUCTIONS:
- Do NOT add sales tax automatically — tax applicability varies by state and job type.
- taxLabel must be null, taxRate must be null, taxAmount must be null unless the transcript explicitly mentions tax.
- total must equal subtotal exactly (unless tax is explicitly mentioned).

PAYMENT TERMS:
- Payment terms are ${paymentTermsLabel} (${paymentDays} days from invoice date).
- paymentTermsDays must be ${paymentDays}
- paymentTermsClause must be: "Payment is due within ${paymentDays} days of invoice date (${paymentTermsLabel})."
- Include the payment terms in customerNotes.

${lateFeeInstruction}

LEGAL:
- This is a US job. Do NOT include any UK-specific language, VAT references, statutory interest language, or references to the Late Payment of Commercial Debts Act.

CURRENCY:
- All monetary amounts must be in USD. Use dollar amounts only, no pound signs.

OUTPUT:
Return ONLY valid JSON with no markdown fences, no commentary. The JSON must match this exact structure:
{
  "jobTitle": "string — concise title for the job",
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unit": "string (e.g. hours, sq ft, item, day)",
      "unitPrice": number,
      "category": "labour" | "materials" | "other",
      "isOptional": boolean
    }
  ],
  "subtotal": number,
  "taxLabel": null,
  "taxRate": null,
  "taxAmount": null,
  "total": number,
  "depositPercent": number (0–50, suggest 25 for most jobs),
  "paymentTermsDays": ${paymentDays},
  "paymentTermsClause": "string",
  "lateFeeClause": ${lateFeeClauseExample},
  "estimatedDays": number,
  "notIncluded": "string — what is explicitly excluded from this quote",
  "customerNotes": "string — include payment terms; include late fee clause if applicable",
  "internalNotes": "string — notes for contractor eyes only, e.g. risk, material lead times"
}`
}

function parsePaymentTermsDays(terms?: string): number | null {
  if (!terms) return null
  const match = terms.toLowerCase().match(/net\s*(\d+)/)
  if (match) return parseInt(match[1], 10)
  return null
}

function validateGeneratedPrice(parsed: unknown): asserts parsed is GeneratedPrice {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('AI response is not a JSON object')
  }

  const obj = parsed as Record<string, unknown>

  if (!Array.isArray(obj.lineItems) || obj.lineItems.length === 0) {
    throw new Error('AI response missing lineItems array or lineItems is empty')
  }

  const total = typeof obj.total === 'number' ? obj.total : parseFloat(String(obj.total))
  if (isNaN(total) || total <= 0) {
    throw new Error(`AI response has invalid total: ${obj.total}`)
  }
}

export async function generatePrice(input: GeneratePriceInput): Promise<GeneratedPrice> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const systemPrompt =
    input.country === 'UK'
      ? buildUkSystemPrompt(input)
      : buildUsSystemPrompt(input)

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: input.transcript }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from AI')

  let parsed: unknown
  try {
    parsed = JSON.parse(content.text)
  } catch {
    throw new Error(`AI response was not valid JSON: ${content.text.slice(0, 200)}`)
  }

  validateGeneratedPrice(parsed)

  return parsed
}

export async function suggestAdditionalItems(params: {
  transcript: string
  tradeType: string
  existingItems: string[]
}): Promise<GeneratedLineItem[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `As an expert ${params.tradeType} contractor, what 2-3 items are commonly missed or forgotten for this job? Job: "${params.transcript}". Already included: ${params.existingItems.join(', ')}. Return ONLY JSON array: [{"description": string, "quantity": number, "unit": string, "unitPrice": number, "category": "labour"|"materials"|"other", "isOptional": true}]`,
    }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return []
  return JSON.parse(content.text) as GeneratedLineItem[]
}
