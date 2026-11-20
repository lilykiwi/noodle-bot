// client for the Does the Dog Die API v3.0
// docs: https://www.doesthedogdie.com/api/3.0

export const DTDD_BASE_URL = 'https://www.doesthedogdie.com/api/v3'
export const DTDD_SITE_URL = 'https://www.doesthedogdie.com'

export interface DTDDItem {
  id: number
  name: string
  genres?: string[]
  releaseYear: number | null
  itemTypeId: number
  itemTypeName: string
  tmdbId?: number | null
  imdbId?: string | null
  backgroundImage?: string | null
  posterImage?: string | null
  overview?: string | null
}

export interface DTDDSeverity {
  levels: string[]
  counts: number[]
  percents: number[]
  total: number
  verified: number | null
}

export interface DTDDTopicItemStat {
  topicItemId: number
  yesSum: number
  noSum: number
  numComments: number
  topicId: number
  topicName: string
  itemId: number
  severity: DTDDSeverity | null
}

export interface DTDDItemDetail extends DTDDItem {
  topicItemStats: DTDDTopicItemStat[]
}

export class DTDDError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'DTDDError'
  }
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export interface DTDDOptions {
  apiKey: string
  fetch?: FetchLike
  baseUrl?: string
}

async function request<T>(path: string, opts: DTDDOptions): Promise<T> {
  if (!opts.apiKey) {
    throw new DTDDError(401, 'missing_api_key', 'DDTDTOKEN is not set')
  }
  const doFetch = opts.fetch ?? fetch
  const resp = await doFetch((opts.baseUrl ?? DTDD_BASE_URL) + path, {
    headers: { 'X-API-KEY': opts.apiKey },
  })

  // read as text first: dtdd sometimes answers with an html page (e.g. the
  // api terms page) instead of json, and resp.json() would just throw
  const text = await resp.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = undefined
  }

  if (!resp.ok) {
    const err = (body ?? {}) as { error?: string; message?: string }
    const code =
      err.error ?? (text.includes('tos_required') ? 'tos_required' : 'http_error')
    const message = err.message ?? `DTDD responded with HTTP ${resp.status}`
    throw new DTDDError(resp.status, code, message)
  }

  if (body === undefined) {
    throw new DTDDError(
      resp.status,
      'invalid_response',
      `DTDD returned non-json (${resp.headers.get('content-type') ?? 'unknown type'})`
    )
  }

  return body as T
}

export function searchItems(query: string, opts: DTDDOptions) {
  return request<DTDDItem[]>(`/items?q=${encodeURIComponent(query)}`, opts)
}

export function getItem(id: string | number, opts: DTDDOptions) {
  return request<DTDDItemDetail>(
    `/items/${encodeURIComponent(String(id))}`,
    opts
  )
}

export function itemPageUrl(id: string | number) {
  return `${DTDD_SITE_URL}/media/${encodeURIComponent(String(id))}`
}
