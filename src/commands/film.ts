import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandStringOption,
  spoiler,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js'
import type * as types from '../types/index.js'
import * as dtdd from '../dtdd/api.js'
import {
  ATTRIBUTION,
  buildSearchOptions,
  describeError,
  formatWarnings,
  formatYear,
  getWarnings,
  truncate,
} from './filmFormat.js'

type FilmInteraction = ChatInputCommandInteraction | StringSelectMenuInteraction

const ACCENT = 0x0099ff

// read lazily so env is always current (bun loads .env automatically)
const dtddOptions = (): dtdd.DTDDOptions => ({
  apiKey: process.env.DDTDTOKEN ?? '',
})

async function sendContainer(
  interaction: FilmInteraction,
  container: ContainerBuilder
) {
  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  })
}

async function sendError(interaction: FilmInteraction, error: unknown) {
  console.error(error)
  const reply = new ContainerBuilder()
    .setAccentColor(0xff4444)
    .addTextDisplayComponents((t) => t.setContent(describeError(error)))
  try {
    await sendContainer(interaction, reply)
  } catch (e) {
    console.error(e)
  }
}

async function filmSearch(query: string, interaction: FilmInteraction) {
  const items = await dtdd.searchItems(query, dtddOptions())
  const reply = new ContainerBuilder().setAccentColor(ACCENT)

  if (items.length == 0) {
    reply
      .addTextDisplayComponents((t) => t.setContent('### No results found!'))
      .addTextDisplayComponents((t) =>
        t.setContent('Try another search term maybe?')
      )
  } else {
    const options = buildSearchOptions(items)
    const placeholder =
      items.length > options.length
        ? `showing ${options.length} of ${items.length} results`
        : `${items.length} results found`
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('filmSelectID')
      .setPlaceholder(placeholder)
      .addOptions(options)

    reply
      .addTextDisplayComponents((t) =>
        t.setContent('Pick one of these to fetch its content warnings!')
      )
      .addActionRowComponents((row) => row.setComponents(selectMenu))
  }

  reply.addTextDisplayComponents((t) => t.setContent(ATTRIBUTION))
  await sendContainer(interaction, reply)
}

async function filmSelectID(id: string, interaction: FilmInteraction) {
  const item = await dtdd.getItem(id, dtddOptions())
  const name = truncate(item.name, 92)

  const reply = new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents((t) =>
      t.setContent(
        `# [${name} (${formatYear(item.releaseYear)})](${dtdd.itemPageUrl(item.id)})`
      )
    )
    .addSeparatorComponents((s) => s)

  const warnings = getWarnings(item.topicItemStats ?? [])
  if (warnings.length > 0) {
    reply.addTextDisplayComponents((t) =>
      t.setContent(spoiler(formatWarnings(warnings)))
    )
  } else if ((item.topicItemStats ?? []).length > 0) {
    reply.addTextDisplayComponents((t) =>
      t.setContent('No topics have more yes votes than no votes!')
    )
  } else {
    reply.addTextDisplayComponents((t) =>
      t.setContent('Nobody has added any votes for this film!')
    )
  }

  reply.addTextDisplayComponents((t) => t.setContent(ATTRIBUTION))
  await sendContainer(interaction, reply)
}

export const film: types.SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName('film')
    .setDescription('Search for a movie (updated!)')
    .addStringOption(
      new SlashCommandStringOption()
        .setName('query')
        .setDescription('The name of the movie to search for')
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName('filmid')
        .setDescription(
          'The numeric ID of a known film, i.e. 10752. Will override query.'
        )
    )
    .toJSON(),

  Handlers: {
    film: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply()

      try {
        const filmID = interaction.options.getString('filmid')
        if (filmID != null) {
          await filmSelectID(filmID, interaction)
          return
        }

        const query = interaction.options.getString('query')
        if (query != null) {
          await filmSearch(query, interaction)
          return
        }
      } catch (error) {
        await sendError(interaction, error)
        return
      }

      // if we get here, the user didn't specify a query *or* a film id.
      const reply = new ContainerBuilder()
        .setAccentColor(ACCENT)
        .addTextDisplayComponents((t) =>
          t.setContent(
            'No search term or film ID. You probably wanted to search or specify an ID?'
          )
        )
      await sendContainer(interaction, reply)
    },
    filmSelectID: async (interaction: StringSelectMenuInteraction) => {
      await interaction.deferUpdate()
      try {
        await filmSelectID(interaction.values[0], interaction)
      } catch (error) {
        await sendError(interaction, error)
      }
    },
  },
}
