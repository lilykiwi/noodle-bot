import { describe, expect, it } from 'bun:test'
import type { WatchlistEntry } from '../db/watchlist.js'
import { buildPickContainer } from './pick.js'
import {
  autocompleteChoices,
  entryLinks,
  formatWatchlist,
  imageUrl,
  letterboxdUrl,
} from './watchlistFormat.js'

const entry = (over: Partial<WatchlistEntry> = {}): WatchlistEntry => ({
  guildId: 'g',
  dtddId: 10752,
  name: 'Old Yeller',
  releaseYear: 1957,
  tmdbId: 22660,
  imdbId: 'tt0050798',
  posterImage: 'https://x.test/p.jpg',
  backgroundImage: 'https://x.test/b.jpg',
  addedBy: '123',
  addedAt: 0,
  ...over,
})

describe('entryLinks', () => {
  it('links dtdd, letterboxd and imdb', () => {
    expect(entryLinks(entry())).toBe(
      '[dtdd](https://www.doesthedogdie.com/media/10752) · ' +
        `[letterboxd](${letterboxdUrl(22660)}) · ` +
        '[imdb](https://www.imdb.com/title/tt0050798)'
    )
  })
  it('skips links it has no id for', () => {
    expect(entryLinks(entry({ tmdbId: null, imdbId: null }))).toBe(
      '[dtdd](https://www.doesthedogdie.com/media/10752)'
    )
  })
})

describe('formatWatchlist', () => {
  it('has a friendly empty message', () => {
    expect(formatWatchlist([])).toContain('empty')
  })
  it('numbers entries and credits who added them', () => {
    const out = formatWatchlist([entry(), entry({ name: 'Jaws', addedBy: '9' })])
    expect(out).toStartWith('1. **Old Yeller (1957)**: <@123>')
    expect(out).toContain('2. **Jaws (1957)**: <@9>')
  })
  it('stays under the text budget', () => {
    const many = Array.from({ length: 100 }, (_, i) => entry({ dtddId: i }))
    const out = formatWatchlist(many, 1000)
    expect(out.length).toBeLessThan(1050)
    expect(out).toMatch(/\.\.\.and \d+ more$/)
  })
})

describe('autocompleteChoices', () => {
  it('caps at 25 and uses the dtdd id as the value', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry({ dtddId: i }))
    const choices = autocompleteChoices(many)
    expect(choices).toHaveLength(25)
    expect(choices[3]).toEqual({ name: 'Old Yeller (1957)', value: '3' })
  })
})

describe('buildPickContainer', () => {
  it('shows the backdrop and carries the film id in both buttons', () => {
    const json = JSON.stringify(buildPickContainer(entry()).toJSON())
    expect(json).toContain('https://x.test/b.jpg')
    expect(json).toContain('pickReroll:10752')
    expect(json).toContain('pickWarnings:10752')
  })
  it('falls back to the poster, or no image at all', () => {
    expect(
      JSON.stringify(buildPickContainer(entry({ backgroundImage: null })).toJSON())
    ).toContain('https://x.test/p.jpg')
    const bare = buildPickContainer(
      entry({ backgroundImage: null, posterImage: null })
    ).toJSON()
    // type 12 is discord's media gallery component
    expect(bare.components.some((c) => c.type == 12)).toBe(false)
  })
})

describe('imageUrl', () => {
  it('picks the first absolute url', () => {
    expect(imageUrl(null, 'rel/x.jpg', 'https://a/b.jpg')).toBe('https://a/b.jpg')
    expect(imageUrl(undefined, '')).toBeNull()
  })
})
