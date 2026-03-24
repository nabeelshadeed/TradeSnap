import { Skeleton } from '@/components/ui/Skeleton'

export default function JobDetailLoading() {
  return (
    <div className="p-5 max-w-3xl space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}
