import { beforeEach, describe, expect, it } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { DTDDItem } from '../dtdd/api.js'
import { WatchlistStore } from './watchlist.js'

const item = (id: number, name = `film ${id}`): DTDDItem => ({
  id,
  name,
  releaseYear: 2000,
  itemTypeId: 15,
  itemTypeName: 'Movie',
  tmdbId: id * 10,
  imdbId: `tt${id}`,
  posterImage: 'p.jpg',
  backgroundImage: 'b.jpg',
})

let store: WatchlistStore
beforeEach(() => {
  store = new WatchlistStore(new Database(':memory:'))
})

describe('WatchlistStore', () => {
  it('adds and lists films oldest first', () => {
    expect(store.add('g', item(2), 'u1', 200)).toBe(true)
    expect(store.add('g', item(1), 'u2', 100)).toBe(true)
    const list = store.list('g')
    expect(list.map((e) => e.dtddId)).toEqual([1, 2])
    expect(list[0]).toMatchObject({
      name: 'film 1',
      tmdbId: 10,
      imdbId: 'tt1',
      addedBy: 'u2',
      backgroundImage: 'b.jpg',
    })
  })

  it('refuses duplicates in the same server', () => {
    store.add('g', item(1), 'u')
    expect(store.add('g', item(1), 'u')).toBe(false)
    expect(store.list('g')).toHaveLength(1)
  })

  it('keeps servers separate', () => {
    store.add('a', item(1), 'u')
    store.add('b', item(1), 'u')
    store.remove('a', 1)
    expect(store.list('a')).toHaveLength(0)
    expect(store.list('b')).toHaveLength(1)
  })

  it('remove reports whether anything was removed', () => {
    store.add('g', item(1), 'u')
    expect(store.remove('g', 1)).toBe(true)
    expect(store.remove('g', 1)).toBe(false)
  })

  it('searches by name, ignoring sql wildcards', () => {
    store.add('g', item(1, 'Old Yeller'), 'u')
    store.add('g', item(2, 'Jaws'), 'u')
    expect(store.search('g', 'yell').map((e) => e.name)).toEqual(['Old Yeller'])
    expect(store.search('g', '%')).toHaveLength(2)
    expect(store.search('g', '')).toHaveLength(2)
  })

  describe('random', () => {
    it('returns null on an empty list', () => {
      expect(store.random('g')).toBeNull()
    })
    it('never returns the excluded film when there are others', () => {
      store.add('g', item(1), 'u')
      store.add('g', item(2), 'u')
      for (let i = 0; i < 20; i++) {
        expect(store.random('g', 1)?.dtddId).toBe(2)
      }
    })
    it('falls back to the excluded film when it is the only one', () => {
      store.add('g', item(1), 'u')
      expect(store.random('g', 1)?.dtddId).toBe(1)
    })
  })
})
