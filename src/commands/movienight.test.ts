import { describe, expect, it } from 'bun:test'
import type { WatchlistEntry } from '../db/watchlist.js'
import { describeError } from './filmFormat.js'
import {
  discordTime,
  nextNight,
  nightConfigFromEnv,
  zonedTime,
  type NightConfig,
} from './movienightTime.js'
import {
  announcement,
  confirmStep,
  dayStep,
  filmStep,
  orderForPicker,
  parseState,
  pickerStep,
} from './movienightViews.js'

const london: NightConfig = {
  timeZone: 'Europe/London',
  hour: 20,
  minute: 0,
  durationHours: 3,
}

const entry = (id: number, addedBy = 'u1'): WatchlistEntry => ({
  guildId: 'g',
  dtddId: id,
  name: `film ${id}`,
  releaseYear: 2000,
  tmdbId: id,
  imdbId: null,
  posterImage: null,
  backgroundImage: 'https://x.test/b.jpg',
  addedBy,
  addedAt: id,
})

const json = (c: { toJSON(): unknown }) => JSON.stringify(c.toJSON())

describe('nightConfigFromEnv', () => {
  it('reads env with sensible defaults', () => {
    expect(nightConfigFromEnv({ MOVIENIGHT_TZ: 'UTC' })).toEqual({
      timeZone: 'UTC',
      hour: 20,
      minute: 0,
      durationHours: 3,
    })
    expect(
      nightConfigFromEnv({ MOVIENIGHT_TZ: 'UTC', MOVIENIGHT_TIME: '19:30', MOVIENIGHT_HOURS: '4' })
    ).toMatchObject({ hour: 19, minute: 30, durationHours: 4 })
  })
})

describe('zonedTime', () => {
  it('handles winter and summer time in london', () => {
    expect(zonedTime(2026, 1, 10, 20, 0, 'Europe/London').toISOString()).toBe(
      '2026-01-10T20:00:00.000Z'
    )
    expect(zonedTime(2026, 7, 11, 20, 0, 'Europe/London').toISOString()).toBe(
      '2026-07-11T19:00:00.000Z'
    )
  })
  it('handles timezones behind utc', () => {
    expect(
      zonedTime(2026, 1, 10, 20, 0, 'America/New_York').toISOString()
    ).toBe('2026-01-11T01:00:00.000Z')
  })
})

describe('nextNight', () => {
  // friday 20 nov 2026, noon utc
  const friday = new Date('2026-11-20T12:00:00Z')

  it('finds the coming saturday and sunday', () => {
    expect(nextNight('sat', london, friday).toISOString()).toBe('2026-11-21T20:00:00.000Z')
    expect(nextNight('sun', london, friday).toISOString()).toBe('2026-11-22T20:00:00.000Z')
  })
  it('uses today if it is saturday and movie night has not started', () => {
    const satAfternoon = new Date('2026-11-21T15:00:00Z')
    expect(nextNight('sat', london, satAfternoon).toISOString()).toBe('2026-11-21T20:00:00.000Z')
  })
  it('skips to next week once it has started', () => {
    const satLate = new Date('2026-11-21T21:00:00Z')
    expect(nextNight('sat', london, satLate).toISOString()).toBe('2026-11-28T20:00:00.000Z')
  })
  it('rolls over month and year ends', () => {
    const dec31 = new Date('2026-12-31T12:00:00Z') // thursday
    expect(nextNight('sat', london, dec31).toISOString()).toBe('2027-01-02T20:00:00.000Z')
  })
  it('crosses the clocks going back', () => {
    // clocks go back sun 25 oct 2026, so saturday 31st is gmt
    const before = new Date('2026-10-23T12:00:00Z')
    expect(nextNight('sat', london, before).toISOString()).toBe('2026-10-24T19:00:00.000Z')
    expect(nextNight('sat', london, new Date('2026-10-25T12:00:00Z')).toISOString()).toBe(
      '2026-10-31T20:00:00.000Z'
    )
  })
})

it('discordTime makes timestamp markup', () => {
  expect(discordTime(new Date('2026-11-21T20:00:00Z'))).toBe('<t:1795291200:F>')
  expect(discordTime(new Date('2026-11-21T20:00:00Z'), 'R')).toBe('<t:1795291200:R>')
})

describe('parseState', () => {
  it('reads state back out of customIds', () => {
    expect(parseState('mnDay:sat')).toEqual({ day: 'sat', picker: undefined, film: undefined })
    expect(parseState('mnConfirm:sun:123:456')).toEqual({ day: 'sun', picker: '123', film: 456 })
  })
  it('ignores junk days', () => {
    expect(parseState('mnDay:tuesday').day).toBeUndefined()
  })
})

describe('orderForPicker', () => {
  it("puts the picker's own suggestions first, keeping order", () => {
    const out = orderForPicker([entry(1, 'a'), entry(2, 'b'), entry(3, 'a'), entry(4, 'b')], 'b')
    expect(out.map((e) => e.dtddId)).toEqual([2, 4, 1, 3])
  })
})

describe('wizard views', () => {
  const start = new Date('2026-11-21T20:00:00Z')

  it('day step offers saturday and sunday', () => {
    const j = json(dayStep())
    expect(j).toContain('mnDay:sat')
    expect(j).toContain('mnDay:sun')
    expect(j).toContain('mnCancel')
  })

  it('each step carries the choices so far', () => {
    expect(json(pickerStep({ day: 'sat' }, start))).toContain('mnPicker:sat')
    expect(json(filmStep({ day: 'sat', picker: '9' }, start, [entry(1)]))).toContain('mnFilm:sat:9')
    expect(json(confirmStep({ day: 'sat', picker: '9' }, start, entry(5)))).toContain(
      'mnConfirm:sat:9:5'
    )
  })

  it('film step caps at 25 and marks the picker suggestions', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry(i, i == 29 ? '9' : 'x'))
    const j = json(filmStep({ day: 'sat', picker: '9' }, start, many))
    expect(j).toContain('showing 25 of 30 films')
    expect(j).toContain('their suggestion')
    // the picker's film made the cut even though it was added last
    expect(j).toContain('"value":"29"')
  })

  it('film step explains an empty watchlist', () => {
    const j = json(filmStep({ day: 'sat', picker: '9' }, start, []))
    expect(j).toContain('watchlist is empty')
    expect(j).not.toContain('mnFilm')
  })

  it('announcement shows time, picker, event link and warnings button', () => {
    const j = json(announcement(entry(7), '9', start, 'https://discord.com/events/1/2'))
    expect(j).toContain('<t:1795291200:F>')
    expect(j).toContain("<@9>'s pick")
    expect(j).toContain('https://discord.com/events/1/2')
    expect(j).toContain('pickWarnings:7')
  })

  it('customIds stay under discord\'s 100 char limit', () => {
    const longest = `mnConfirm:sun:${'9'.repeat(20)}:${'9'.repeat(10)}`
    expect(longest.length).toBeLessThanOrEqual(100)
  })
})

it('describeError explains missing permissions', () => {
  expect(describeError({ code: 50013 })).toContain('Create Events')
})
