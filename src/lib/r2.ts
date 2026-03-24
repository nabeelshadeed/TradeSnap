import type { S3Client } from '@aws-sdk/client-s3'

let _r2: S3Client | null = null

export function getR2(): S3Client {
  if (_r2) return _r2
  const { S3Client } = require('@aws-sdk/client-s3')
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
  return _r2!
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? 'tradesnap-docs'

export async function getSignedUploadUrl(key: string, contentType: string): Promise<string> {
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
  const { PutObjectCommand } = require('@aws-sdk/client-s3')
  const r2 = getR2()
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn: 300 })
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
  const { GetObjectCommand } = require('@aws-sdk/client-s3')
  const r2 = getR2()
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn: 3600 })
}

export async function deleteR2Object(key: string): Promise<void> {
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
  const r2 = getR2()
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}
