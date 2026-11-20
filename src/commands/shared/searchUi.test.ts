import { describe, expect, it } from 'bun:test'
import type { SearchResult } from '../../dtdd/search.js'
import type { DTDDItem } from '../../dtdd/api.js'
import {
  buildSearchContainer,
  parseMediaType,
  searchFooter,
  searchPlaceholder,
} from './searchUi.js'

const result = (n: number, over: Partial<SearchResult> = {}): SearchResult => ({
  query: 'jaws',
  hiddenCount: 0,
  items: Array.from(
    { length: n },
    (_, i) =>
      ({ id: i, name: `f${i}`, releaseYear: 1975, itemTypeName: 'Movie' }) as DTDDItem
  ),
  ...over,
})

describe('parseMediaType', () => {
  it('defaults to movie', () => {
    expect(parseMediaType(null)).toBe('movie')
    expect(parseMediaType('nonsense')).toBe('movie')
    expect(parseMediaType('tv')).toBe('tv')
  })
})

describe('searchPlaceholder', () => {
  it('pluralises and notes truncation', () => {
    expect(searchPlaceholder(result(1), 1)).toBe('1 result found')
    expect(searchPlaceholder(result(3), 3)).toBe('3 results found')
    expect(searchPlaceholder(result(40), 25)).toBe('showing 25 of 40 results')
  })
})

describe('searchFooter', () => {
  it('mentions hidden results and the year tip', () => {
    const f = searchFooter(result(1, { hiddenCount: 2 }))
    expect(f).toContain('2 other results hidden')
    expect(f).toContain('add a year')
  })
  it('skips the year tip when a year is already in the query', () => {
    expect(searchFooter(result(1, { query: 'halloween 1978' }))).toBe('')
  })
})

describe('buildSearchContainer', () => {
  it('uses the given customId for the select menu', () => {
    const json = buildSearchContainer(result(2), {
      customId: 'watchlistAdd',
      prompt: 'pick one',
    }).toJSON()
    expect(JSON.stringify(json)).toContain('"custom_id":"watchlistAdd"')
  })
  it('shows a no results message with no menu', () => {
    const json = JSON.stringify(
      buildSearchContainer(result(0), { customId: 'x', prompt: 'p' }).toJSON()
    )
    expect(json).toContain('No results found')
    expect(json).not.toContain('custom_id')
  })
})
