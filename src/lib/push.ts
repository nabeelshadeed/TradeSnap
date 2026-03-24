export function getWebPush() {
  const webpush = require('web-push')
  webpush.setVapidDetails(
    'mailto:support@tradesnap.app',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  return webpush
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  const webpush = getWebPush()
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err) {
    console.error('Push notification failed:', err)
  }
}
