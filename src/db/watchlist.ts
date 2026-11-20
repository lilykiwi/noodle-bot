// per-server watchlist, stored in sqlite (bun:sqlite, no extra deps)
import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { DTDDItem } from '../dtdd/api.js'

export interface WatchlistEntry {
  guildId: string
  dtddId: number
  name: string
  releaseYear: number | null
  tmdbId: number | null
  imdbId: string | null
  posterImage: string | null
  backgroundImage: string | null
  addedBy: string
  addedAt: number
}

type Row = {
  guild_id: string
  dtdd_id: number
  name: string
  release_year: number | null
  tmdb_id: number | null
  imdb_id: string | null
  poster_image: string | null
  background_image: string | null
  added_by: string
  added_at: number
}

const fromRow = (r: Row): WatchlistEntry => ({
  guildId: r.guild_id,
  dtddId: r.dtdd_id,
  name: r.name,
  releaseYear: r.release_year,
  tmdbId: r.tmdb_id,
  imdbId: r.imdb_id,
  posterImage: r.poster_image,
  backgroundImage: r.background_image,
  addedBy: r.added_by,
  addedAt: r.added_at,
})

export class WatchlistStore {
  constructor(private db: Database) {
    db.run(`
      CREATE TABLE IF NOT EXISTS watchlist (
        guild_id TEXT NOT NULL,
        dtdd_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        release_year INTEGER,
        tmdb_id INTEGER,
        imdb_id TEXT,
        poster_image TEXT,
        background_image TEXT,
        added_by TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (guild_id, dtdd_id)
      )
    `)
  }

  // returns false if the film was already on this server's list
  add(guildId: string, item: DTDDItem, addedBy: string, now = Date.now()) {
    const res = this.db
      .query(
        `INSERT OR IGNORE INTO watchlist VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        guildId,
        item.id,
        item.name,
        item.releaseYear ?? null,
        item.tmdbId ?? null,
        item.imdbId ?? null,
        item.posterImage ?? null,
        item.backgroundImage ?? null,
        addedBy,
        now
      )
    return res.changes > 0
  }

  remove(guildId: string, dtddId: number) {
    return (
      this.db
        .query(`DELETE FROM watchlist WHERE guild_id = ? AND dtdd_id = ?`)
        .run(guildId, dtddId).changes > 0
    )
  }

  get(guildId: string, dtddId: number): WatchlistEntry | null {
    const row = this.db
      .query<Row, [string, number]>(
        `SELECT * FROM watchlist WHERE guild_id = ? AND dtdd_id = ?`
      )
      .get(guildId, dtddId)
    return row ? fromRow(row) : null
  }

  // oldest first, so the list reads like a queue
  list(guildId: string): WatchlistEntry[] {
    return this.db
      .query<Row, [string]>(
        `SELECT * FROM watchlist WHERE guild_id = ? ORDER BY added_at, name`
      )
      .all(guildId)
      .map(fromRow)
  }

  search(guildId: string, text: string, limit = 25): WatchlistEntry[] {
    return this.db
      .query<Row, [string, string, number]>(
        `SELECT * FROM watchlist WHERE guild_id = ? AND name LIKE ?
         ORDER BY name LIMIT ?`
      )
      .all(guildId, `%${text.replace(/[%_]/g, '')}%`, limit)
      .map(fromRow)
  }

  // optionally skip one id so a reroll never gives the same film twice
  random(guildId: string, excludeId?: number): WatchlistEntry | null {
    const row = this.db
      .query<Row, [string, number]>(
        `SELECT * FROM watchlist WHERE guild_id = ? AND dtdd_id != ?
         ORDER BY RANDOM() LIMIT 1`
      )
      .get(guildId, excludeId ?? -1)
    if (row) return fromRow(row)
    // only one film on the list, so the excluded one is all there is
    return excludeId != null ? this.get(guildId, excludeId) : null
  }
}

let store: WatchlistStore | null = null

export function getWatchlist(): WatchlistStore {
  if (!store) {
    const path = process.env.DB_PATH ?? 'data/noodle.db'
    mkdirSync(dirname(path), { recursive: true })
    store = new WatchlistStore(new Database(path, { create: true }))
  }
  return store
}
