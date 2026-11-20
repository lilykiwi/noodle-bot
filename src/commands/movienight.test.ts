import { describe, expect, it } from 'bun:test'
import type { WatchlistEntry } from '../db/watchlist.js'
import { describeError } from './filmFormat.js'
import {
  discordTime,
  nextNight,
  nightConfigFromEnv,
  parseTimeOfDay,
  parseWhen,
  zonedTime,
  type NightConfig,
} from './movienightTime.js'
import {
  announcement,
  confirmStep,
  dayStep,
  entryFromItem,
  filmStep,
  orderForPicker,
  parseState,
  pickerStep,
  searchStep,
  whenToken,
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
      hour: 21,
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
    expect(parseState('mnDay:sat')).toEqual({ day: 'sat', at: undefined, picker: undefined, film: undefined })
    expect(parseState('mnConfirm:sun:123:456')).toEqual({ day: 'sun', at: undefined, picker: '123', film: 456 })
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
    expect(json(confirmStep({ day: 'sat', picker: '9' }, start, entry(5), true))).toContain(
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

describe('parseTimeOfDay', () => {
  it('reads 24h, 12h and squashed times', () => {
    expect(parseTimeOfDay('21:00')).toEqual({ hour: 21, minute: 0 })
    expect(parseTimeOfDay('9pm')).toEqual({ hour: 21, minute: 0 })
    expect(parseTimeOfDay('9:30 PM')).toEqual({ hour: 21, minute: 30 })
    expect(parseTimeOfDay('12am')).toEqual({ hour: 0, minute: 0 })
    expect(parseTimeOfDay('12pm')).toEqual({ hour: 12, minute: 0 })
    expect(parseTimeOfDay('2130')).toEqual({ hour: 21, minute: 30 })
    expect(parseTimeOfDay('7')).toEqual({ hour: 7, minute: 0 })
  })
  it('rejects nonsense', () => {
    expect(parseTimeOfDay('25:00')).toBeNull()
    expect(parseTimeOfDay('13pm')).toBeNull()
    expect(parseTimeOfDay('soon')).toBeNull()
  })
})

describe('parseWhen', () => {
  // friday 20 nov 2026, noon in london
  const now = new Date('2026-11-20T12:00:00Z')
  const at = (d: string, t = '') => {
    const r = parseWhen(d, t, london, now)
    return 'at' in r ? r.at.toISOString() : r.error
  }

  it('blank day means today at the usual time', () => {
    expect(at('')).toBe('2026-11-20T20:00:00.000Z')
    expect(at('tonight', '22:30')).toBe('2026-11-20T22:30:00.000Z')
  })
  it('understands tomorrow and weekdays', () => {
    expect(at('tomorrow', '7pm')).toBe('2026-11-21T19:00:00.000Z')
    expect(at('Wednesday')).toBe('2026-11-25T20:00:00.000Z')
    expect(at('fri', '9pm')).toBe('2026-11-20T21:00:00.000Z')
    // friday at 10am has passed, so next friday
    expect(at('friday', '10:00')).toBe('2026-11-27T10:00:00.000Z')
  })
  it('understands dates', () => {
    expect(at('2026-12-05', '18:00')).toBe('2026-12-05T18:00:00.000Z')
    expect(at('27/11')).toBe('2026-11-27T20:00:00.000Z')
    expect(at('5/1')).toBe('2027-01-05T20:00:00.000Z')
    expect(at('1/7/27', '20:00')).toBe('2027-07-01T19:00:00.000Z')
  })
  it('explains what went wrong', () => {
    expect(at('', '10am')).toContain('past')
    expect(at('31/02')).toContain("doesn't exist")
    expect(at('2028-01-01')).toContain('year away')
    expect(at('someday')).toContain("couldn't read that date")
    expect(at('today', 'late')).toContain("couldn't read that time")
  })
  it('keeps errors emoji-free for the ephemeral wizard', () => {
    for (const msg of [at('', '10am'), at('31/02'), at('2028-01-01')]) {
      expect(msg).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })
})

describe('impromptu state', () => {
  it('round-trips an exact time through customIds', () => {
    const state = { at: 1795291200, picker: '9' }
    expect(whenToken(state)).toBe('t1795291200')
    expect(parseState(`mnFilm:${whenToken(state)}:9`)).toMatchObject(state)
  })
  it('impromptu customIds stay under 100 chars', () => {
    const longest = `mnSearchOpen:t9999999999:${'9'.repeat(20)}`
    expect(longest.length).toBeLessThanOrEqual(100)
  })
})

describe('searching inside the wizard', () => {
  const start = new Date('2026-11-21T20:00:00Z')

  it('the film step always offers search, even with an empty watchlist', () => {
    const empty = json(filmStep({ day: 'sat', picker: '9' }, start, []))
    expect(empty).toContain('mnSearchOpen:sat:9')
    const full = json(filmStep({ day: 'sat', picker: '9' }, start, [entry(1)]))
    expect(full).toContain('mnSearchOpen:sat:9')
  })

  it('search results feed back into the same film step', () => {
    const result = {
      query: 'jaws',
      hiddenCount: 0,
      items: [{ id: 42, name: 'Jaws', releaseYear: 1975, itemTypeId: 15, itemTypeName: 'Movie' }],
    }
    const j = json(searchStep({ at: 1795291200, picker: '9' }, start, result))
    expect(j).toContain('"custom_id":"mnFilm:t1795291200:9"')
    expect(j).toContain('search again')
  })

  it('entryFromItem shapes a dtdd item like a watchlist entry', () => {
    const e = entryFromItem(
      { id: 42, name: 'Jaws', releaseYear: 1975, itemTypeId: 15, itemTypeName: 'Movie', tmdbId: 578 },
      'g',
      '9'
    )
    expect(e).toMatchObject({ dtddId: 42, name: 'Jaws', tmdbId: 578, imdbId: null, addedBy: '9' })
  })

  it('confirm text says whether the film comes off the watchlist', () => {
    expect(json(confirmStep({ day: 'sat', picker: '9' }, start, entry(5), true))).toContain(
      'off the watchlist'
    )
    expect(json(confirmStep({ day: 'sat', picker: '9' }, start, entry(5), false))).not.toContain(
      'off the watchlist'
    )
  })

  it('wizard screens have no emoji', () => {
    const screens = [
      dayStep('oops'),
      pickerStep({ day: 'sat' }, start),
      filmStep({ day: 'sat', picker: '9' }, start, [entry(1)]),
      filmStep({ day: 'sat', picker: '9' }, start, []),
      confirmStep({ day: 'sat', picker: '9' }, start, entry(5), true),
    ]
    for (const s of screens) {
      expect(json(s)).not.toMatch(/\p{Extended_Pictographic}/u)
    }
  })
})
