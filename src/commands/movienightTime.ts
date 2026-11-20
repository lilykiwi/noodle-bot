// working out "next saturday at 8pm" in the server's timezone
export type NightDay = 'sat' | 'sun'

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}
const DAY_INDEX: Record<NightDay, number> = { sun: 0, sat: 6 }
export const DAY_LABEL: Record<NightDay, string> = {
  sat: 'Saturday',
  sun: 'Sunday',
}

export interface NightConfig {
  timeZone: string
  hour: number
  minute: number
  durationHours: number
}

export function nightConfigFromEnv(env = process.env): NightConfig {
  const [h, m] = (env.MOVIENIGHT_TIME ?? '21:00').split(':').map(Number)
  return {
    timeZone:
      env.MOVIENIGHT_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: Number.isFinite(h) ? h : 21,
    minute: Number.isFinite(m) ? m : 0,
    durationHours: Number(env.MOVIENIGHT_HOURS) || 3,
  }
}

// wall clock parts of `date` as seen in `timeZone`
function zonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  )
  return {
    weekday: WEEKDAY_INDEX[parts.weekday],
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

// ms that `timeZone` is ahead of utc at `date`
function zoneOffset(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

// a wall clock time in `timeZone` -> the real instant (dst-safe)
export function zonedTime(
  y: number, mo: number, d: number, h: number, mi: number, timeZone: string
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  let t = guess - zoneOffset(new Date(guess), timeZone)
  t = guess - zoneOffset(new Date(t), timeZone)
  return new Date(t)
}

type Today = ReturnType<typeof zonedParts>

// `days` after today's calendar date, at h:m wall clock time
function dayAt(today: Today, days: number, hour: number, minute: number, tz: string) {
  // step through calendar days in utc so month ends roll over properly
  const cal = new Date(Date.UTC(today.year, today.month - 1, today.day + days))
  return zonedTime(
    cal.getUTCFullYear(), cal.getUTCMonth() + 1, cal.getUTCDate(), hour, minute, tz
  )
}

// the next weekday (0 = sunday) at h:m that hasn't started yet
function nextWeekday(
  weekday: number, hour: number, minute: number, tz: string, now: Date
) {
  const today = zonedParts(now, tz)
  let ahead = (weekday - today.weekday + 7) % 7
  for (;;) {
    const start = dayAt(today, ahead, hour, minute, tz)
    if (start.getTime() > now.getTime()) return start
    ahead += 7
  }
}

// the next `day` at the configured time that hasn't started yet
export function nextNight(day: NightDay, cfg: NightConfig, now = new Date()) {
  return nextWeekday(DAY_INDEX[day], cfg.hour, cfg.minute, cfg.timeZone, now)
}

// "21:00", "9pm", "9:30 pm", "2130", "21"
export function parseTimeOfDay(text: string) {
  const m = /^(\d{1,2})(?:[:.h]?(\d{2}))?(am|pm)?$/.exec(
    text.trim().toLowerCase().replace(/\s+/g, '')
  )
  if (!m) return null
  let hour = Number(m[1])
  const minute = Number(m[2] ?? 0)
  if (m[3]) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (m[3] == 'pm' ? 12 : 0)
  }
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

const WEEKDAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// turns the impromptu modal's "date" + "time" boxes into a real instant.
// date: blank/today, tomorrow, a weekday, 2026-11-27, or 27/11 (day first)
// time: blank = the usual movie night time
export function parseWhen(
  dateText: string,
  timeText: string,
  cfg: NightConfig,
  now = new Date()
): { at: Date } | { error: string } {
  const time = timeText.trim()
    ? parseTimeOfDay(timeText)
    : { hour: cfg.hour, minute: cfg.minute }
  if (!time) return { error: "couldn't read that time! try `21:00` or `9pm`" }

  const tz = cfg.timeZone
  const today = zonedParts(now, tz)
  const d = dateText.trim().toLowerCase()
  let at: Date

  const weekday = WEEKDAY_NAMES.findIndex((w) => d.length >= 3 && w.startsWith(d.slice(0, 3)) && /^[a-z]+$/.test(d))
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d)
  const dmy = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2}|\d{4}))?$/.exec(d)

  if (d == '' || d == 'today' || d == 'tonight') {
    at = dayAt(today, 0, time.hour, time.minute, tz)
  } else if (d == 'tomorrow' || d == 'tmrw') {
    at = dayAt(today, 1, time.hour, time.minute, tz)
  } else if (weekday >= 0) {
    at = nextWeekday(weekday, time.hour, time.minute, tz, now)
  } else if (iso || dmy) {
    let y: number, mo: number, day: number
    if (iso) [y, mo, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    else {
      day = Number(dmy![1])
      mo = Number(dmy![2])
      y = dmy![3] ? Number(dmy![3].padStart(4, '20')) : today.year
    }
    // reject things like 31/02 instead of rolling them into march
    const check = new Date(Date.UTC(y, mo - 1, day))
    if (check.getUTCMonth() != mo - 1 || check.getUTCDate() != day) {
      return { error: "that date doesn't exist!" }
    }
    at = zonedTime(y, mo, day, time.hour, time.minute, tz)
    // "27/11" with no year means the next one
    if (dmy && !dmy[3] && at.getTime() <= now.getTime()) {
      at = zonedTime(y + 1, mo, day, time.hour, time.minute, tz)
    }
  } else {
    return { error: "couldn't read that date! try `today`, `friday`, `27/11` or `2026-11-27`" }
  }

  if (at.getTime() <= now.getTime()) return { error: "that's in the past!" }
  if (at.getTime() - now.getTime() > 365 * 86400_000) {
    return { error: "that's more than a year away!" }
  }
  return { at }
}

// discord timestamp markup, renders in each viewer's own timezone
export const discordTime = (d: Date, style: 'F' | 'R' | 't' = 'F') =>
  `<t:${Math.floor(d.getTime() / 1000)}:${style}>`
