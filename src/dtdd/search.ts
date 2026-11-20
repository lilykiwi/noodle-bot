// shared film search used by /film, /watchlist and /movienight.
// filters out media types you didn't ask for and pushes obscure-looking
// entries (no poster / overview / tmdb id) below the well-known ones.
import { searchItems, type DTDDItem, type DTDDOptions } from './api.js'

export const MEDIA_TYPES = {
  movie: 'Movie',
  tv: 'TV',
  book: 'Book',
  any: null,
} as const
export type MediaType = keyof typeof MEDIA_TYPES

export interface SearchResult {
  query: string
  items: DTDDItem[]
  // results dropped because they were a different media type
  hiddenCount: number
}

export function dtddOptionsFromEnv(): DTDDOptions {
  // read lazily so env is always current (bun loads .env automatically)
  return { apiKey: process.env.DDTDTOKEN ?? '' }
}

// higher = looks more like a real, findable release
export function completenessScore(item: DTDDItem): number {
  return (
    (item.posterImage ? 1 : 0) +
    (item.overview?.trim() ? 1 : 0) +
    (item.tmdbId ? 1 : 0)
  )
}

export function filterByType(items: DTDDItem[], type: MediaType): DTDDItem[] {
  const wanted = MEDIA_TYPES[type]
  if (wanted == null) return items
  return items.filter(
    (i) => i.itemTypeName?.toLowerCase() == wanted.toLowerCase()
  )
}

// stable sort: dtdd's own relevance order is kept within each score
export function rankItems(items: DTDDItem[]): DTDDItem[] {
  return items
    .map((item, index) => ({ item, index, score: completenessScore(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.item)
}

export function refineResults(
  query: string,
  items: DTDDItem[],
  type: MediaType = 'movie'
): SearchResult {
  const filtered = filterByType(items, type)
  return {
    query,
    items: rankItems(filtered),
    hiddenCount: items.length - filtered.length,
  }
}

export async function searchFilms(
  query: string,
  type: MediaType = 'movie',
  opts: DTDDOptions = dtddOptionsFromEnv()
): Promise<SearchResult> {
  return refineResults(query, await searchItems(query, opts), type)
}
