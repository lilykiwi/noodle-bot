// pure helpers for the film command, kept separate so they're easy to test
import type { DTDDItem, DTDDTopicItemStat, DTDDError } from '../dtdd/api.js'

// discord limits
export const MAX_SELECT_OPTIONS = 25
export const MAX_OPTION_LABEL = 100
export const MAX_OPTION_DESCRIPTION = 100
export const MAX_TEXT_DISPLAY = 4000

export const ATTRIBUTION =
  '-# [Powered by DoesTheDogDie.com](https://www.doesthedogdie.com)'

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.substring(0, max - 3) + '...'
}

export function formatYear(year: number | null | undefined): string {
  return year ? String(year) : '????'
}

export interface SelectOption {
  label: string
  description: string
  value: string
}

export function buildSearchOptions(items: DTDDItem[]): SelectOption[] {
  return items.slice(0, MAX_SELECT_OPTIONS).map((item) => {
    const suffix = ` (${formatYear(item.releaseYear)})`
    const name = truncate(item.name || 'untitled', MAX_OPTION_LABEL - suffix.length)
    return {
      label: name + suffix,
      description: truncate(
        item.overview?.trim() || 'no description provided',
        MAX_OPTION_DESCRIPTION
      ),
      value: String(item.id),
    }
  })
}

// topics where more people voted yes than no, most yes votes first
export function getWarnings(stats: DTDDTopicItemStat[]): DTDDTopicItemStat[] {
  return stats
    .filter((s) => s.yesSum > s.noSum)
    .sort((a, b) => b.yesSum - a.yesSum)
}

// numbered markdown list of warnings, cut off before discord's text limit.
// `budget` leaves room for the spoiler bars + a "and N more" line
export function formatWarnings(
  warnings: DTDDTopicItemStat[],
  budget = MAX_TEXT_DISPLAY - 100
): string {
  let output = ''
  for (let i = 0; i < warnings.length; i++) {
    const w = warnings[i]
    const line = `${i + 1}. ${w.topicName}  \`${w.yesSum}+, ${w.noSum}-\`\n`
    if (output.length + line.length > budget) {
      output += `...and ${warnings.length - i} more\n`
      break
    }
    output += line
  }
  return output
}

export function describeError(error: unknown): string {
  const e = error as Partial<DTDDError>
  if (e?.name === 'DTDDError') {
    switch (e.code) {
      case 'missing_api_key':
      case 'invalid_api_key':
      case 'app_key_not_permitted':
        return "the bot's DTDD api key is missing or invalid :("
      case 'tos_required':
        return "the bot's DTDD account needs to accept the API terms of service first!"
      case 'rate_limit_exceeded':
        return "slow down! we're being rate limited, try again in a minute"
      case 'monthly_limit_exceeded':
        return "we've hit the monthly DTDD request limit :("
      case 'not_found':
        return "couldn't find that film id!"
    }
  }
  return 'Something went wrong! ping <@583325947022016523>'
}
