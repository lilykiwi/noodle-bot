// reusable search result picker for any command that needs "choose a film"
import {
  ContainerBuilder,
  SlashCommandStringOption,
  StringSelectMenuBuilder,
} from 'discord.js'
import type { MediaType, SearchResult } from '../../dtdd/search.js'
import { ATTRIBUTION, buildSearchOptions } from '../filmFormat.js'

export const ACCENT = 0x0099ff

export function mediaTypeOption() {
  return new SlashCommandStringOption()
    .setName('type')
    .setDescription('What kind of media to search (default: movies)')
    .addChoices(
      { name: 'Movies', value: 'movie' satisfies MediaType },
      { name: 'TV', value: 'tv' satisfies MediaType },
      { name: 'Books', value: 'book' satisfies MediaType },
      { name: 'Everything', value: 'any' satisfies MediaType }
    )
}

export function parseMediaType(value: string | null): MediaType {
  return value == 'tv' || value == 'book' || value == 'any' ? value : 'movie'
}

export function searchPlaceholder(result: SearchResult, shown: number) {
  const total = result.items.length
  return total > shown
    ? `showing ${shown} of ${total} results`
    : `${total} result${total == 1 ? '' : 's'} found`
}

export function searchFooter(result: SearchResult): string {
  const lines: string[] = []
  if (result.hiddenCount > 0) {
    lines.push(
      `-# ${result.hiddenCount} other result${result.hiddenCount == 1 ? '' : 's'} hidden, try \`type: Everything\``
    )
  }
  if (!/\b(19|20)\d\d\b/.test(result.query)) {
    lines.push('-# tip: add a year to your search, like `halloween 1978`')
  }
  return lines.join('\n')
}

export function buildSearchContainer(
  result: SearchResult,
  opts: { customId: string; prompt: string }
): ContainerBuilder {
  const reply = new ContainerBuilder().setAccentColor(ACCENT)

  if (result.items.length == 0) {
    reply.addTextDisplayComponents((t) =>
      t.setContent('### No results found!\nTry another search term maybe?')
    )
  } else {
    const options = buildSearchOptions(result.items)
    const menu = new StringSelectMenuBuilder()
      .setCustomId(opts.customId)
      .setPlaceholder(searchPlaceholder(result, options.length))
      .addOptions(options)
    reply
      .addTextDisplayComponents((t) => t.setContent(opts.prompt))
      .addActionRowComponents((row) => row.setComponents(menu))
  }

  const footer = searchFooter(result)
  reply.addTextDisplayComponents((t) =>
    t.setContent(footer ? `${footer}\n${ATTRIBUTION}` : ATTRIBUTION)
  )
  return reply
}
