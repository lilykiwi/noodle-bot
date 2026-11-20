// the "content warnings for one film" view, shared by /film and /pick
import { ContainerBuilder, spoiler } from 'discord.js'
import * as dtdd from '../../dtdd/api.js'
import { dtddOptionsFromEnv } from '../../dtdd/search.js'
import {
  ATTRIBUTION,
  formatWarnings,
  formatYear,
  getWarnings,
  truncate,
} from '../filmFormat.js'
import { ACCENT } from './searchUi.js'

export function buildWarningsContainer(
  item: dtdd.DTDDItemDetail
): ContainerBuilder {
  const name = truncate(item.name, 92)
  const stats = item.topicItemStats ?? []
  const warnings = getWarnings(stats)

  let body: string
  if (warnings.length > 0) body = spoiler(formatWarnings(warnings))
  else if (stats.length > 0)
    body = 'No topics have more yes votes than no votes!'
  else body = 'Nobody has added any votes for this film!'

  return new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents((t) =>
      t.setContent(
        `# [${name} (${formatYear(item.releaseYear)})](${dtdd.itemPageUrl(item.id)})`
      )
    )
    .addSeparatorComponents((s) => s)
    .addTextDisplayComponents((t) => t.setContent(body))
    .addTextDisplayComponents((t) => t.setContent(ATTRIBUTION))
}

export async function fetchWarningsContainer(id: string | number) {
  return buildWarningsContainer(await dtdd.getItem(id, dtddOptionsFromEnv()))
}
