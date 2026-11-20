// pure helpers for /watchlist and /pick
import type { WatchlistEntry } from '../db/watchlist.js'
import { itemPageUrl } from '../dtdd/api.js'
import { formatYear, MAX_TEXT_DISPLAY, truncate } from './filmFormat.js'

export function letterboxdUrl(tmdbId: number) {
  // letterboxd redirects /tmdb/<id> to the film's own page
  return `https://letterboxd.com/tmdb/${tmdbId}`
}

export function entryTitle(e: Pick<WatchlistEntry, 'name' | 'releaseYear'>) {
  return `${e.name} (${formatYear(e.releaseYear)})`
}

export function entryLinks(e: WatchlistEntry): string {
  const links = [`[dtdd](${itemPageUrl(e.dtddId)})`]
  if (e.tmdbId) links.push(`[letterboxd](${letterboxdUrl(e.tmdbId)})`)
  if (e.imdbId) links.push(`[imdb](https://www.imdb.com/title/${e.imdbId})`)
  return links.join(' · ')
}

export function formatWatchlist(
  entries: WatchlistEntry[],
  budget = MAX_TEXT_DISPLAY - 200
): string {
  if (entries.length == 0) {
    return 'the watchlist is empty! add something with `/watchlist add` 🍿'
  }
  let out = ''
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const line = `${i + 1}. **${entryTitle(e)}**: <@${e.addedBy}> · ${entryLinks(e)}\n`
    if (out.length + line.length > budget) {
      out += `...and ${entries.length - i} more`
      break
    }
    out += line
  }
  return out.trimEnd()
}

export function autocompleteChoices(entries: WatchlistEntry[]) {
  return entries.slice(0, 25).map((e) => ({
    name: truncate(entryTitle(e), 100),
    value: String(e.dtddId),
  }))
}

// discord only accepts absolute http(s) urls for media, skip anything else
export function imageUrl(...candidates: (string | null | undefined)[]) {
  return candidates.find((u) => u && /^https?:\/\//.test(u)) ?? null
}
