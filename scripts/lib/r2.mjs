/**
 * Single boundary for Cloudflare R2 access.
 *
 * All three audio scripts previously constructed their own S3 client and
 * repeated the same bucket constants. Centralising it means a change to the
 * cache policy or the normalization marker happens in exactly one place.
 */

import fs from 'node:fs/promises'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'

export const BUCKET_NAME = 'adaofeliz-blog-audio'
export const PUBLIC_AUDIO_URL_BASE = 'https://audio.adaofeliz.com'

/** Bumping this makes every stored object eligible for reprocessing. */
export const NORMALIZATION_VERSION = 'v1'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.CLOUDFLARE_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_SECRET_ACCESS_KEY

/**
 * Read-only workflows fall back to the public CDN, so callers can inspect
 * published audio with no secrets configured at all.
 */
export const hasR2Credentials = Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY)

let client = null

function getClient() {
  if (!hasR2Credentials) {
    throw new Error(
      'R2 credentials missing. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_KEY_ID and CLOUDFLARE_SECRET_ACCESS_KEY.'
    )
  }

  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  })

  return client
}

export function publicUrlFor(key) {
  return `${PUBLIC_AUDIO_URL_BASE}/${key}`
}

/**
 * Store an object, tagged as normalized.
 *
 * Cache lifetime is deliberately finite rather than immutable: these keys are
 * rewritten in place when audio is repaired, so the CDN has to be able to pick
 * up a corrected file.
 */
export async function putObject(key, body, contentType, extraMetadata = {}) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=86400',
      Metadata: { normalized: NORMALIZATION_VERSION, ...extraMetadata },
    })
  )
}

export async function putAudio(key, buffer, extraMetadata = {}) {
  await putObject(key, buffer, 'audio/mpeg', extraMetadata)
}

export async function putTimestamps(key, payload) {
  await putObject(key, JSON.stringify(payload, null, 2), 'application/json')
}

/** Returns the normalization marker, or null when absent or unreadable. */
export async function readNormalizationMarker(key) {
  if (!hasR2Credentials) return null
  const head = await getClient().send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
  return head.Metadata?.['normalized'] ?? null
}

export async function objectExists(key) {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
    return true
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return false
    throw error
  }
}

export async function copyObject(fromKey, toKey) {
  await getClient().send(
    new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      Key: toKey,
      CopySource: `${BUCKET_NAME}/${fromKey}`,
    })
  )
}

/**
 * Download an object to disk, preferring authenticated R2 and falling back to
 * the public CDN so read-only modes need no credentials.
 */
export async function downloadToFile(key, destination, { publicUrl = null } = {}) {
  if (hasR2Credentials) {
    const response = await getClient().send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
    await fs.writeFile(destination, Buffer.from(await response.Body.transformToByteArray()))
    return
  }

  const url = publicUrl ?? publicUrlFor(key)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`)
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()))
}
