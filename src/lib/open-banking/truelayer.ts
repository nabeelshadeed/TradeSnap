export function getTrueLayerConfig() {
  return {
    clientId: process.env.TRUELAYER_CLIENT_ID!,
    clientSecret: process.env.TRUELAYER_CLIENT_SECRET!,
    redirectUri: process.env.TRUELAYER_REDIRECT_URI!,
    authUrl: 'https://auth.truelayer.com',
    apiUrl: 'https://api.truelayer.com',
  }
}

export function generateAuthUrl(state: string): string {
  const config = getTrueLayerConfig()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'info accounts balance transactions',
    state,
  })
  return `${config.authUrl}/?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const config = getTrueLayerConfig()
  const response = await fetch(`${config.authUrl}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }),
  })
  if (!response.ok) throw new Error('Failed to exchange code for token')
  return response.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const config = getTrueLayerConfig()
  const response = await fetch(`${config.authUrl}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  })
  if (!response.ok) throw new Error('Failed to refresh token')
  return response.json()
}

export async function getTransactions(
  accessToken: string,
  from: string,
  to: string
): Promise<Array<{
  transaction_id: string
  timestamp: string
  description: string
  transaction_type: string
  amount: number
  currency: string
  merchant_name?: string
  running_balance?: { amount: number; currency: string }
}>> {
  const config = getTrueLayerConfig()
  const accountsRes = await fetch(`${config.apiUrl}/data/v1/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!accountsRes.ok) throw new Error('Failed to fetch accounts')
  const { results: accounts } = await accountsRes.json()

  const allTransactions = []
  for (const account of accounts) {
    const txRes = await fetch(
      `${config.apiUrl}/data/v1/accounts/${account.account_id}/transactions?from=${from}&to=${to}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!txRes.ok) continue
    const { results } = await txRes.json()
    allTransactions.push(...results)
  }
  return allTransactions
}
