import { describe, expect, it, mock } from 'bun:test'
import type { DTDDItem, FetchLike } from './api.js'
import {
  completenessScore,
  filterByType,
  rankItems,
  refineResults,
  searchFilms,
} from './search.js'

const item = (id: number, over: Partial<DTDDItem> = {}): DTDDItem => ({
  id,
  name: `film ${id}`,
  releaseYear: 2000,
  itemTypeId: 15,
  itemTypeName: 'Movie',
  posterImage: 'p.jpg',
  overview: 'a film',
  tmdbId: id,
  ...over,
})

const obscure = (id: number) =>
  item(id, { posterImage: null, overview: '', tmdbId: null })

describe('completenessScore', () => {
  it('counts poster, overview and tmdb id', () => {
    expect(completenessScore(item(1))).toBe(3)
    expect(completenessScore(obscure(1))).toBe(0)
    expect(completenessScore(item(1, { overview: '   ' }))).toBe(2)
  })
})

describe('filterByType', () => {
  const mixed = [
    item(1),
    item(2, { itemTypeName: 'TV' }),
    item(3, { itemTypeName: 'Book' }),
  ]
  it('keeps only movies by default type', () => {
    expect(filterByType(mixed, 'movie').map((i) => i.id)).toEqual([1])
  })
  it('matches case-insensitively', () => {
    expect(
      filterByType([item(4, { itemTypeName: 'movie' })], 'movie')
    ).toHaveLength(1)
  })
  it('keeps everything for any', () => {
    expect(filterByType(mixed, 'any')).toHaveLength(3)
  })
})

describe('rankItems', () => {
  it('puts the famous feature above the obscure short', () => {
    const ranked = rankItems([obscure(1), item(2)])
    expect(ranked.map((i) => i.id)).toEqual([2, 1])
  })
  it("keeps dtdd's order within the same score", () => {
    const ranked = rankItems([item(1), obscure(2), item(3), obscure(4)])
    expect(ranked.map((i) => i.id)).toEqual([1, 3, 2, 4])
  })
})

describe('refineResults', () => {
  it('reports how many results the type filter hid', () => {
    const r = refineResults('x', [item(1), item(2, { itemTypeName: 'TV' })])
    expect(r.items.map((i) => i.id)).toEqual([1])
    expect(r.hiddenCount).toBe(1)
  })
})

describe('searchFilms', () => {
  it('fetches, filters and ranks in one go', async () => {
    const body = [obscure(1), item(2, { itemTypeName: 'TV' }), item(3)]
    const fetch = mock<FetchLike>(async () => new Response(JSON.stringify(body)))
    const r = await searchFilms('jaws', 'movie', { apiKey: 'k', fetch })
    expect(r.items.map((i) => i.id)).toEqual([3, 1])
    expect(r.hiddenCount).toBe(1)
  })
})
