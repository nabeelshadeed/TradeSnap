import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Building2, CreditCard, Users, Landmark, PenLine } from 'lucide-react'

const SECTIONS = [
  {
    href: '/settings/business',
    icon: Building2,
    label: 'Business Details',
    desc: 'Name, logo, brand colour, invoice branding',
    primary: true,
  },
  {
    href: '/settings/signature',
    icon: PenLine,
    label: 'Your Signature',
    desc: 'Draw once, applied to all documents',
    primary: false,
  },
  {
    href: '/settings/billing',
    icon: CreditCard,
    label: 'Billing & Plan',
    desc: 'Manage subscription',
    primary: false,
  },
  {
    href: '/settings/bank',
    icon: Landmark,
    label: 'Bank Account',
    desc: 'Connect for faster payment matching',
    primary: false,
  },
  {
    href: '/settings/team',
    icon: Users,
    label: 'Team',
    desc: 'Add and manage team members',
    primary: false,
  },
]

export default async function SettingsPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')

  const initials = (ctx.user.firstName?.[0] ?? '') + (ctx.user.lastName?.[0] ?? '')

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-5 h-14 flex items-center sticky top-0 z-20">
        <h1 className="text-base font-semibold text-gray-900">Settings</h1>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto w-full pb-32">

        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-lg shrink-0">
            {initials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {ctx.user.firstName} {ctx.user.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{ctx.user.email}</p>
            <p className="text-xs text-orange-600 font-semibold capitalize mt-0.5">{ctx.contractor.plan} plan</p>
          </div>
        </div>

        {/* Business details — primary, more prominent */}
        <Link
          href="/settings/business"
          className="flex items-center gap-4 bg-white rounded-2xl border-2 border-orange-200 p-4 active:bg-orange-50 transition-colors"
          style={{ minHeight: 64 }}
        >
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Business Details</p>
            <p className="text-xs text-gray-500">Name, logo, contact number, invoice branding</p>
          </div>
          <ChevronRight size={18} className="text-gray-400 shrink-0" />
        </Link>

        {/* Other settings */}
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {SECTIONS.filter(s => !s.primary).map(section => (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 px-4 py-4 active:bg-gray-50 transition-colors"
              style={{ minHeight: 64 }}
            >
              <section.icon size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{section.label}</p>
                <p className="text-xs text-gray-500">{section.desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
