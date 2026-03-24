let _resend: import('resend').Resend | null = null

export function getResend() {
  if (_resend) return _resend
  const { Resend } = require('resend')
  _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend!
}

export const EMAIL_FROM = `${process.env.EMAIL_FROM_NAME ?? 'SnapTrade'} <${process.env.EMAIL_FROM ?? 'jobs@snaptrade.app'}>`
