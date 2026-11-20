import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ContainerBuilder,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from 'discord.js'
import type * as types from '../types/index.js'
import { getWatchlist } from '../db/watchlist.js'
import { getItem } from '../dtdd/api.js'
import { dtddOptionsFromEnv, searchFilms } from '../dtdd/search.js'
import { ATTRIBUTION } from './filmFormat.js'
import { sendContainer, sendError, sendText } from './shared/reply.js'
import {
  ACCENT,
  buildSearchContainer,
  mediaTypeOption,
  parseMediaType,
} from './shared/searchUi.js'
import {
  autocompleteChoices,
  entryTitle,
  formatWatchlist,
  imageUrl,
} from './watchlistFormat.js'

async function add(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString('query', true)
  const type = parseMediaType(interaction.options.getString('type'))
  const result = await searchFilms(query, type)
  await sendContainer(
    interaction,
    buildSearchContainer(result, {
      customId: 'watchlistAdd',
      prompt: 'Which one should go on the watchlist?',
    })
  )
}

async function list(interaction: ChatInputCommandInteraction) {
  const entries = getWatchlist().list(interaction.guildId!)
  await sendContainer(
    interaction,
    new ContainerBuilder()
      .setAccentColor(ACCENT)
      .addTextDisplayComponents((t) =>
        t.setContent(`## 🍿 watchlist (${entries.length})`)
      )
      .addTextDisplayComponents((t) => t.setContent(formatWatchlist(entries)))
  )
}

async function remove(interaction: ChatInputCommandInteraction) {
  const value = interaction.options.getString('film', true)
  const store = getWatchlist()
  const entry = store.get(interaction.guildId!, Number(value))
  if (!entry || !store.remove(interaction.guildId!, entry.dtddId)) {
    await sendText(
      interaction,
      "couldn't find that on the watchlist! pick one from the suggestions 🐾"
    )
    return
  }
  await sendText(interaction, `removed **${entryTitle(entry)}** from the watchlist`)
}

export const watchlist: types.SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName('watchlist')
    .setDescription("The server's list of films to watch")
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Search for a film and add it to the watchlist')
        .addStringOption((o) =>
          o
            .setName('query')
            .setDescription('The name of the film')
            .setRequired(true)
        )
        .addStringOption(mediaTypeOption())
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Show the watchlist')
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a film from the watchlist')
        .addStringOption((o) =>
          o
            .setName('film')
            .setDescription('The film to remove')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .toJSON(),

  Handlers: {
    watchlist: async (interaction: ChatInputCommandInteraction) => {
      const sub = interaction.options.getSubcommand()
      // searching + picking only shows up for the person running it
      await interaction.deferReply(
        sub == 'add' ? { flags: MessageFlags.Ephemeral } : {}
      )
      try {
        switch (sub) {
          case 'add':
            return await add(interaction)
          case 'list':
            return await list(interaction)
          case 'remove':
            return await remove(interaction)
        }
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    watchlistAdd: async (interaction: StringSelectMenuInteraction) => {
      await interaction.deferUpdate()
      try {
        const item = await getItem(interaction.values[0], dtddOptionsFromEnv())
        const added = getWatchlist().add(
          interaction.guildId!,
          item,
          interaction.user.id
        )
        const text = added
          ? `added **${entryTitle(item)}** to the watchlist!`
          : `**${entryTitle(item)}** is already on the watchlist!`

        const reply = new ContainerBuilder().setAccentColor(ACCENT)
        const poster = imageUrl(item.posterImage)
        if (poster) {
          reply.addSectionComponents((s) =>
            s
              .addTextDisplayComponents((t) => t.setContent(text))
              .setThumbnailAccessory((th) => th.setURL(poster))
          )
        } else {
          reply.addTextDisplayComponents((t) => t.setContent(text))
        }
        reply.addTextDisplayComponents((t) => t.setContent(ATTRIBUTION))
        await sendContainer(interaction, reply)
      } catch (error) {
        await sendError(interaction, error)
      }
    },
  },

  Autocomplete: {
    watchlist: async (interaction: AutocompleteInteraction) => {
      try {
        const text = interaction.options.getFocused()
        const entries = getWatchlist().search(interaction.guildId!, text)
        await interaction.respond(autocompleteChoices(entries))
      } catch (error) {
        console.error(error)
      }
    },
  },
}
