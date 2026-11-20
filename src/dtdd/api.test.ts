import { describe, expect, it, mock } from 'bun:test'
import {
  DTDDError,
  type DTDDItem,
  type FetchLike,
  DTDD_BASE_URL,
  getItem,
  itemPageUrl,
  searchItems,
} from './api.js'

function mockFetch(status: number, body: unknown) {
  return mock<FetchLike>(
    async () =>
      new Response(typeof body == 'string' ? body : JSON.stringify(body), {
        status,
      })
  )
}

describe('searchItems', () => {
  it('hits /items with an encoded query and the api key header', async () => {
    const fetch = mockFetch(200, [{ id: 10752, name: 'Old Yeller' }])
    const items = await searchItems('old yeller & co', { apiKey: 'k', fetch })

    expect(items).toEqual([{ id: 10752, name: 'Old Yeller' }] as DTDDItem[])
    expect(fetch).toHaveBeenCalledWith(
      `${DTDD_BASE_URL}/items?q=old%20yeller%20%26%20co`,
      { headers: { 'X-API-KEY': 'k' } }
    )
  })

  it('throws without an api key and never calls fetch', async () => {
    const fetch = mockFetch(200, [])
    await expect(searchItems('x', { apiKey: '', fetch })).rejects.toMatchObject(
      { code: 'missing_api_key' }
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('getItem', () => {
  it('hits /items/:id', async () => {
    const fetch = mockFetch(200, { id: 1, topicItemStats: [] })
    await getItem(1, { apiKey: 'k', fetch })
    expect(fetch.mock.calls[0][0]).toBe(`${DTDD_BASE_URL}/items/1`)
  })

  it('turns api error bodies into DTDDErrors', async () => {
    const fetch = mockFetch(429, {
      error: 'rate_limit_exceeded',
      message: 'slow down',
    })
    const err = await getItem(1, { apiKey: 'k', fetch }).catch((e) => e)
    expect(err).toBeInstanceOf(DTDDError)
    expect(err).toMatchObject({
      status: 429,
      code: 'rate_limit_exceeded',
      message: 'slow down',
    })
  })

  it('copes with non-json error bodies', async () => {
    const fetch = mockFetch(502, '<html>bad gateway</html>')
    await expect(getItem(1, { apiKey: 'k', fetch })).rejects.toMatchObject({
      status: 502,
      code: 'http_error',
    })
  })
})

it('itemPageUrl points at the media page', () => {
  expect(itemPageUrl(10752)).toBe('https://www.doesthedogdie.com/media/10752')
})
