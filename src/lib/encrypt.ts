/**
 * AES-256-GCM symmetric encryption for sensitive DB values (e.g. OB tokens).
 *
 * Requires OB_ENCRYPTION_KEY env var: a 64-char hex string (32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

async function getKey(): Promise<CryptoKey> {
  const hex = process.env.OB_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('OB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  const raw = Uint8Array.from(Buffer.from(hex, 'hex'))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return Buffer.from(combined).toString('base64')
}

export async function decryptToken(encrypted: string): Promise<string> {
  const key = await getKey()
  const combined = Buffer.from(encrypted, 'base64')
  const iv = combined.subarray(0, 12)
  const data = combined.subarray(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(plaintext)
}
