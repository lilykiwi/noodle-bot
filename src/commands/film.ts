import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  StringSelectMenuInteraction,
} from 'discord.js'
import type * as types from '../types/index.js'
import { searchFilms } from '../dtdd/search.js'
import { sendContainer, sendError, sendText } from './shared/reply.js'
import {
  buildSearchContainer,
  mediaTypeOption,
  parseMediaType,
} from './shared/searchUi.js'
import { fetchWarningsContainer } from './shared/warnings.js'

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
    .addStringOption(mediaTypeOption())
    .toJSON(),

  Handlers: {
    film: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply()

      try {
        const filmID = interaction.options.getString('filmid')
        if (filmID != null) {
          await sendContainer(interaction, await fetchWarningsContainer(filmID))
          return
        }

        const query = interaction.options.getString('query')
        if (query != null) {
          const type = parseMediaType(interaction.options.getString('type'))
          const result = await searchFilms(query, type)
          await sendContainer(
            interaction,
            buildSearchContainer(result, {
              customId: 'filmSelectID',
              prompt: 'Pick one of these to fetch its content warnings!',
            })
          )
          return
        }

        // the user didn't specify a query *or* a film id
        await sendText(
          interaction,
          'No search term or film ID. You probably wanted to search or specify an ID?'
        )
      } catch (error) {
        await sendError(interaction, error)
      }
    },
    filmSelectID: async (interaction: StringSelectMenuInteraction) => {
      await interaction.deferUpdate()
      try {
        await sendContainer(
          interaction,
          await fetchWarningsContainer(interaction.values[0])
        )
      } catch (error) {
        await sendError(interaction, error)
      }
    },
  },
}
