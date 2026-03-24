import { RiskBadge } from '@/components/ui/RiskBadge'

interface RiskScoreProps {
  riskLevel: 'good' | 'average' | 'slow' | 'avoid'
  avgPaymentDays?: number | null
  latePaymentCount?: number
  communityRiskScore?: number | null
  communityReportCount?: number
}

export function RiskScore({
  riskLevel,
  avgPaymentDays,
  latePaymentCount = 0,
  communityRiskScore,
  communityReportCount = 0,
}: RiskScoreProps) {
  return (
    <div className="space-y-2">
      <RiskBadge level={riskLevel} size="md" />
      {avgPaymentDays !== null && avgPaymentDays !== undefined && (
        <p className="text-sm text-gray-600">
          Avg payment: <strong>{avgPaymentDays} days</strong>
        </p>
      )}
      {latePaymentCount > 0 && (
        <p className="text-sm text-amber-700">
          Late payments: <strong>{latePaymentCount}</strong>
        </p>
      )}
      {communityReportCount > 1 && communityRiskScore !== null && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
          Community: {communityReportCount} contractors have worked with this customer.
          {communityRiskScore && communityRiskScore < 60 && (
            <span className="text-amber-700 font-medium"> Others report slow payment.</span>
          )}
        </p>
      )}
    </div>
  )
}
