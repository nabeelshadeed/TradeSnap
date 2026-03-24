export interface StatutoryInterestResult {
  dailyRate: number
  daysOverdue: number
  interest: number
  fixedCompensation: number
  totalClaim: number
  interestRate: number
}

export function calculateStatutoryInterest(
  invoiceAmount: number,
  dueDateISO: string,
  todayISO: string = new Date().toISOString(),
  bankBaseRate: number = 4.0
): StatutoryInterestResult {
  const interestRate = bankBaseRate + 8 // 12% currently
  const dailyRate = (invoiceAmount * (interestRate / 100)) / 365
  const dueDate = new Date(dueDateISO)
  const today = new Date(todayISO)
  const diffMs = today.getTime() - dueDate.getTime()
  const daysOverdue = Math.max(0, Math.floor(diffMs / 86_400_000))
  const interest = dailyRate * daysOverdue

  let fixedCompensation = 40
  if (invoiceAmount >= 10_000) fixedCompensation = 100
  else if (invoiceAmount >= 1_000) fixedCompensation = 70

  const totalClaim = interest + fixedCompensation

  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    daysOverdue,
    interest: Math.round(interest * 100) / 100,
    fixedCompensation,
    totalClaim: Math.round(totalClaim * 100) / 100,
    interestRate,
  }
}

export const UK_DEFAULT_TERMS = `Payment is due within {payment_days} days of invoice date. We reserve the right to charge statutory interest on overdue invoices at 8% above the Bank of England base rate per annum under the Late Payment of Commercial Debts (Interest) Act 1998. Fixed compensation may also be applied to cover recovery costs.`

export const TRADE_TERMS: Record<string, string> = {
  electrician: `All electrical work is carried out in accordance with BS 7671 18th Edition IET Wiring Regulations. An Electrical Installation Certificate will be issued upon completion of notifiable work. Payment is due within {payment_days} days of invoice date. Statutory interest at 12% per annum may be charged on late payments under the Late Payment of Commercial Debts Act 1998.`,
  'gas-engineer': `All gas work is carried out by a Gas Safe Registered engineer. Gas Safe Registration No: [add your number]. Landlord Gas Safety Certificates issued where required. Payment is due within {payment_days} days of invoice date. Statutory interest at 12% per annum may be charged on late payments under the Late Payment of Commercial Debts Act 1998.`,
  plumber: `All plumbing work is carried out in accordance with Water Regulations 1999. Payment is due within {payment_days} days of invoice date. Statutory interest at 12% per annum may be charged on late payments under the Late Payment of Commercial Debts Act 1998.`,
  roofer: `All roofing work is carried out in accordance with BS 5534 Code of Practice for Slating and Tiling. Payment is due within {payment_days} days of invoice date. Statutory interest at 12% per annum may be charged on late payments under the Late Payment of Commercial Debts Act 1998.`,
  default: `Work is carried out to a professional standard. Payment is due within {payment_days} days of invoice date. Statutory interest at 12% per annum may be charged on late payments under the Late Payment of Commercial Debts Act 1998.`,
}

export function getTradeTerms(tradeType: string, paymentDays: number): string {
  const template = TRADE_TERMS[tradeType] ?? TRADE_TERMS.default
  return template.replace('{payment_days}', String(paymentDays))
}

export const PRICE_BOOK_SEEDS: Record<string, Array<{ name: string; unit: string; unitPrice: number; category: string }>> = {
  electrician: [
    { name: 'Electrician Labour', unit: 'hr', unitPrice: 65, category: 'labour' },
    { name: 'First Fix Labour', unit: 'day', unitPrice: 480, category: 'labour' },
    { name: 'Second Fix Labour', unit: 'day', unitPrice: 480, category: 'labour' },
    { name: 'Consumer Unit Supply & Fit', unit: 'item', unitPrice: 420, category: 'materials' },
    { name: 'Electrical Installation Certificate', unit: 'item', unitPrice: 35, category: 'other' },
    { name: 'Materials Allowance', unit: 'item', unitPrice: 150, category: 'materials' },
  ],
  'gas-engineer': [
    { name: 'Gas Engineer Labour', unit: 'hr', unitPrice: 75, category: 'labour' },
    { name: 'Boiler Service', unit: 'item', unitPrice: 90, category: 'labour' },
    { name: 'Gas Safe Certificate', unit: 'item', unitPrice: 35, category: 'other' },
    { name: 'Boiler Supply & Fit', unit: 'item', unitPrice: 650, category: 'materials' },
    { name: 'Flue Check', unit: 'item', unitPrice: 45, category: 'labour' },
  ],
  plumber: [
    { name: 'Plumber Labour', unit: 'hr', unitPrice: 70, category: 'labour' },
    { name: 'Emergency Call-Out', unit: 'item', unitPrice: 120, category: 'labour' },
    { name: 'Materials Allowance', unit: 'item', unitPrice: 100, category: 'materials' },
    { name: 'Pressure Test', unit: 'item', unitPrice: 45, category: 'labour' },
  ],
  roofer: [
    { name: 'Strip & Re-felt', unit: 'm²', unitPrice: 18, category: 'labour' },
    { name: 'Ridge Tile Replacement', unit: 'tile', unitPrice: 12, category: 'labour' },
    { name: 'Labour', unit: 'day', unitPrice: 360, category: 'labour' },
    { name: 'Skip Hire', unit: 'item', unitPrice: 180, category: 'other' },
    { name: 'Materials', unit: 'item', unitPrice: 200, category: 'materials' },
  ],
  painter: [
    { name: 'Prep & Prime', unit: 'm²', unitPrice: 4.50, category: 'labour' },
    { name: 'Top Coat x2', unit: 'm²', unitPrice: 6, category: 'labour' },
    { name: 'Ceiling', unit: 'm²', unitPrice: 3.50, category: 'labour' },
    { name: 'Masking & Protection', unit: 'item', unitPrice: 40, category: 'labour' },
    { name: 'Undercoat', unit: 'm²', unitPrice: 3, category: 'labour' },
  ],
  hvac: [
    { name: 'HVAC Labour', unit: 'hr', unitPrice: 75, category: 'labour' },
    { name: 'Air Con Unit Supply', unit: 'item', unitPrice: 800, category: 'materials' },
    { name: 'Commissioning', unit: 'item', unitPrice: 120, category: 'labour' },
  ],
  landscaper: [
    { name: 'Turf Supply & Lay', unit: 'm²', unitPrice: 12, category: 'labour' },
    { name: 'Excavation', unit: 'm³', unitPrice: 45, category: 'labour' },
    { name: 'Edging', unit: 'm', unitPrice: 8, category: 'labour' },
    { name: 'Planting Labour', unit: 'hr', unitPrice: 40, category: 'labour' },
    { name: 'Skip Hire', unit: 'item', unitPrice: 180, category: 'other' },
  ],
  carpenter: [
    { name: 'Carpenter Labour', unit: 'hr', unitPrice: 60, category: 'labour' },
    { name: 'Materials Allowance', unit: 'item', unitPrice: 150, category: 'materials' },
  ],
  tiler: [
    { name: 'Tiling Labour', unit: 'm²', unitPrice: 35, category: 'labour' },
    { name: 'Tile Adhesive & Grout', unit: 'm²', unitPrice: 8, category: 'materials' },
    { name: 'Floor Prep', unit: 'm²', unitPrice: 12, category: 'labour' },
  ],
  'general-builder': [
    { name: 'Builder Labour', unit: 'day', unitPrice: 350, category: 'labour' },
    { name: 'Materials Allowance', unit: 'item', unitPrice: 200, category: 'materials' },
    { name: 'Skip Hire', unit: 'item', unitPrice: 180, category: 'other' },
  ],
}

export const TRADE_AVG_JOB_VALUES: Record<string, number> = {
  electrician: 800,
  plumber: 600,
  roofer: 2500,
  hvac: 1200,
  painter: 900,
  tiler: 700,
  landscaper: 1500,
  carpenter: 800,
  'gas-engineer': 600,
  'general-builder': 1500,
  other: 500,
}
