# SnapTrade — Real-Time Cash Flow Control for Trade Contractors

> Stop chasing payments. Get paid same day.

SnapTrade turns site notes into professional prices in 90 seconds and automates every invoice and reminder, so trade contractors can focus on the work.

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Auth**: Clerk (with Organisations for team accounts)
- **AI**: Anthropic Claude API (claude-opus-4-5)
- **Payments**: Stripe (subscriptions + invoice payment)
- **Open Banking**: TrueLayer (UK) / Plaid (global fallback)
- **Storage**: Cloudflare R2
- **Email**: Resend
- **Queue**: Upstash Redis
- **Deployment**: Vercel

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in all required environment variables. See `.env.example` for details.

### 3. Set up the database

Create a Supabase project at [supabase.com](https://supabase.com), then:

```bash
npm run db:push
```

### 4. Set up Clerk

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Enable Organisations
3. Add the webhook endpoint: `POST /api/webhooks/clerk`
4. Subscribe to: `user.created`, `user.updated`, `organizationMembership.created`

### 5. Set up Stripe

1. Create products and prices in Stripe dashboard
2. Add the webhook endpoint: `POST /api/webhooks/stripe`
3. Subscribe to: `payment_intent.succeeded`, `customer.subscription.updated`

### 6. Set up Cloudflare R2

1. Create an R2 bucket named `snaptrade-docs`
2. Create API credentials with `Object Read & Write` permissions

### 7. Set up Resend

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Set `EMAIL_FROM` to your verified domain email

### 8. Generate VAPID keys (Web Push)

```bash
npx web-push generate-vapid-keys
```

### 9. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Clerk auth pages
│   ├── (onboarding)/     # Onboarding flow
│   ├── (app)/            # Authenticated app shell
│   │   ├── dashboard/    # Money control panel
│   │   ├── jobs/         # Job management + AI wizard
│   │   ├── customers/    # Customer management + risk scores
│   │   ├── payments/     # Payment command centre
│   │   ├── price-book/   # Saved items + prices
│   │   └── settings/     # Profile, billing, bank, team
│   ├── (public)/         # No-auth customer pages
│   │   ├── q/[token]/    # Price signing page
│   │   ├── pay/[token]/  # Invoice payment page
│   │   └── receipt/[token]/ # Payment receipt
│   └── api/              # All API routes
├── components/
│   ├── layout/           # Sidebar, TopBar, BottomNav, QuickMode
│   ├── ui/               # Shared UI components
│   ├── jobs/             # Job-specific components
│   ├── customers/        # Customer components
│   └── payments/         # Payment components
└── lib/
    ├── db/               # Drizzle schema, relations, client
    ├── auth/             # Auth context helper
    ├── ai/               # Claude API integration
    ├── open-banking/     # TrueLayer + Plaid clients
    ├── pdf/              # PDF generation
    └── *.ts              # Service clients (Stripe, Resend, R2, etc.)
```

## Key Features

### AI Price Generation
Contractors describe the job by voice or text. Claude extracts a professional line-item price breakdown in seconds, with trade-specific knowledge and warnings.

### Automated Payment Escalation
Invoice sent → Day 3 reminder → Day 7 firm notice → Day 14 statutory interest → Day 30 final notice. All pre-written, legally informed emails sent automatically.

### UK Statutory Interest Calculator
Calculates Late Payment of Commercial Debts Act 1998 interest (8% + Bank of England base rate) and fixed compensation (£40/£70/£100) for every overdue invoice.

### Customer Risk Scoring
Every customer gets a risk score (good/average/slow/avoid) based on payment history. Warns contractors before taking on risky customers. Cross-contractor community intelligence aggregated anonymously.

### Open Banking Reconciliation
Connects via TrueLayer (FCA regulated, 98% UK bank coverage). Auto-matches incoming bank transactions to outstanding invoices. High-confidence matches reconcile silently.

### Electronic Signature Capture
Price pages capture signer name, email, IP, user agent, and millisecond timestamp. Constitutes binding e-signature under UK Electronic Communications Act 2000.

### Evidence Pack Export
One click generates a ZIP with: signed quote PDF, all job photos, invoice PDF, audit trail, change orders, and auto-generated covering letter citing Late Payment Act 1998.

## Plans

| Plan | Price | Jobs/month | AI | Open Banking | Users |
|------|-------|-----------|-----|-------------|-------|
| Free | £0 | 3 | ❌ | ❌ | 1 |
| Starter | £29/mo | 50 | 5/mo | ❌ | 1 |
| Pro | £49/mo | Unlimited | Unlimited | ✅ | 5 |
| Business | £99/mo | Unlimited | Unlimited | ✅ | 20 |

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

The `vercel.json` configures:
- Cron jobs: payment reminders (8am daily), OB sync (6am daily), stats refresh (midnight)
- Security headers: X-Frame-Options, CSP, etc.

## Legal Notes

This software is built for UK trade contractors and includes:
- Late Payment of Commercial Debts (Interest) Act 1998 calculations
- 2025/2026 UK payment reform compliance (60-day max terms, 30-day dispute window)
- Electronic signatures under UK Electronic Communications Act 2000
- GDPR-compliant data handling

---

Built with ⚡ by SnapTrade
