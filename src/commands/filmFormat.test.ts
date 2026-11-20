import { describe, expect, it } from 'bun:test'
import type { DTDDItem, DTDDTopicItemStat } from '../dtdd/api.js'
import { DTDDError } from '../dtdd/api.js'
import {
  buildSearchOptions,
  describeError,
  formatWarnings,
  formatYear,
  getWarnings,
  MAX_OPTION_DESCRIPTION,
  MAX_OPTION_LABEL,
  MAX_SELECT_OPTIONS,
  truncate,
} from './filmFormat.js'

const item = (over: Partial<DTDDItem> = {}): DTDDItem => ({
  id: 10752,
  name: 'Old Yeller',
  releaseYear: 1957,
  itemTypeId: 15,
  itemTypeName: 'Movie',
  overview: 'Young Travis Coates is left to take care of...',
  ...over,
})

const stat = (
  topicName: string,
  yesSum: number,
  noSum: number
): DTDDTopicItemStat => ({
  topicItemId: 1,
  topicId: 1,
  itemId: 1,
  numComments: 0,
  severity: null,
  topicName,
  yesSum,
  noSum,
})

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('hi', 5)).toBe('hi')
  })
  it('cuts long text to exactly max with an ellipsis', () => {
    const out = truncate('abcdefghij', 6)
    expect(out).toBe('abc...')
    expect(out).toHaveLength(6)
  })
})

describe('formatYear', () => {
  it('shows ???? for missing years', () => {
    expect(formatYear(null)).toBe('????')
    expect(formatYear(undefined)).toBe('????')
    expect(formatYear(1957)).toBe('1957')
  })
})

describe('buildSearchOptions', () => {
  it('maps items to select options', () => {
    expect(buildSearchOptions([item()])).toEqual([
      {
        label: 'Old Yeller (1957)',
        description: 'Young Travis Coates is left to take care of...',
        value: '10752',
      },
    ])
  })

  it('caps at 25 options', () => {
    const items = Array.from({ length: 40 }, (_, i) => item({ id: i }))
    expect(buildSearchOptions(items)).toHaveLength(MAX_SELECT_OPTIONS)
  })

  it('keeps labels and descriptions within discord limits', () => {
    const [opt] = buildSearchOptions([
      item({ name: 'x'.repeat(300), overview: 'y'.repeat(300) }),
    ])
    expect(opt.label.length).toBeLessThanOrEqual(MAX_OPTION_LABEL)
    expect(opt.label.endsWith('... (1957)')).toBe(true)
    expect(opt.description.length).toBeLessThanOrEqual(MAX_OPTION_DESCRIPTION)
  })

  it('handles missing overview and year', () => {
    const [opt] = buildSearchOptions([
      item({ overview: null, releaseYear: null }),
    ])
    expect(opt.description).toBe('no description provided')
    expect(opt.label).toBe('Old Yeller (????)')
  })
})

describe('getWarnings', () => {
  it('keeps yes-majority topics sorted by yes votes', () => {
    const out = getWarnings([
      stat('a', 5, 1),
      stat('b', 2, 9),
      stat('c', 50, 3),
      stat('d', 3, 3),
    ])
    expect(out.map((s) => s.topicName)).toEqual(['c', 'a'])
  })
})

describe('formatWarnings', () => {
  it('renders a numbered list', () => {
    expect(formatWarnings([stat('a dog dies', 57, 3)])).toBe(
      '1. a dog dies  `57+, 3-`\n'
    )
  })

  it('stops before the budget and says how many were left out', () => {
    const many = Array.from({ length: 200 }, (_, i) => stat(`topic ${i}`, 9, 1))
    const out = formatWarnings(many, 500)
    expect(out.length).toBeLessThanOrEqual(530)
    expect(out).toMatch(/\.\.\.and \d+ more\n$/)
  })
})

describe('describeError', () => {
  it('gives friendly messages for known api errors', () => {
    expect(
      describeError(new DTDDError(429, 'rate_limit_exceeded', ''))
    ).toMatch(/rate limited/)
    expect(describeError(new DTDDError(404, 'not_found', ''))).toMatch(
      /couldn't find/
    )
  })
  it('falls back to a generic message', () => {
    expect(describeError(new Error('boom'))).toMatch(/Something went wrong/)
  })
})
