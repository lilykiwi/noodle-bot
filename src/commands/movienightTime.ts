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
  const [h, m] = (env.MOVIENIGHT_TIME ?? '20:00').split(':').map(Number)
  return {
    timeZone:
      env.MOVIENIGHT_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: Number.isFinite(h) ? h : 20,
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

// the next `day` at the configured time that hasn't started yet
export function nextNight(day: NightDay, cfg: NightConfig, now = new Date()) {
  const today = zonedParts(now, cfg.timeZone)
  let ahead = (DAY_INDEX[day] - today.weekday + 7) % 7
  for (;;) {
    // step through calendar days in utc so month ends roll over properly
    const cal = new Date(Date.UTC(today.year, today.month - 1, today.day + ahead))
    const start = zonedTime(
      cal.getUTCFullYear(), cal.getUTCMonth() + 1, cal.getUTCDate(),
      cfg.hour, cfg.minute, cfg.timeZone
    )
    if (start.getTime() > now.getTime()) return start
    ahead += 7
  }
}

// discord timestamp markup, renders in each viewer's own timezone
export const discordTime = (d: Date, style: 'F' | 'R' | 't' = 'F') =>
  `<t:${Math.floor(d.getTime() / 1000)}:${style}>`
