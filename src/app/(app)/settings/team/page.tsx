import { getAuthContext } from '@/lib/auth/get-auth'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TeamPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/auth/sign-in')
  if (ctx.role !== 'owner') redirect('/settings')

  return (
    <div>
      <TopBar title="Team" />
      <div className="p-5 max-w-2xl space-y-4">
        <Link href="/settings" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={14} />Back to settings
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-600">
            Team management is handled via Clerk. Invite team members and set roles from your organization settings.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Owner → full access | Admin → create/send | Worker → view only
          </p>
        </div>
      </div>
    </div>
  )
}
