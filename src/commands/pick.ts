import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ContainerBuilder,
  InteractionContextType,
  SlashCommandBuilder,
} from 'discord.js'
import type * as types from '../types/index.js'
import { getWatchlist, type WatchlistEntry } from '../db/watchlist.js'
import { sendContainer, sendError, sendText } from './shared/reply.js'
import { ACCENT } from './shared/searchUi.js'
import { fetchWarningsContainer } from './shared/warnings.js'
import { entryLinks, entryTitle, imageUrl } from './watchlistFormat.js'

const EMPTY = 'the watchlist is empty! add something with `/watchlist add` 🍿'

export function buildPickContainer(entry: WatchlistEntry): ContainerBuilder {
  const reply = new ContainerBuilder().setAccentColor(ACCENT)
  const image = imageUrl(entry.backgroundImage, entry.posterImage)
  if (image) {
    reply.addMediaGalleryComponents((g) =>
      g.addItems((item) => item.setURL(image))
    )
  }
  return reply
    .addTextDisplayComponents((t) =>
      t.setContent(
        `## 🎲 tonight's pick: ${entryTitle(entry)}\n` +
          `added by <@${entry.addedBy}> · ${entryLinks(entry)}`
      )
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`pickReroll:${entry.dtddId}`)
          .setLabel('reroll')
          .setEmoji('🎲')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`pickWarnings:${entry.dtddId}`)
          .setLabel('content warnings')
          .setEmoji('⚠️')
          .setStyle(ButtonStyle.Secondary)
      )
    )
}

const idFrom = (customId: string) => Number(customId.split(':')[1])

export const pick: types.SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName('pick')
    .setDescription('Pick a random film from the watchlist')
    .setContexts(InteractionContextType.Guild)
    .toJSON(),

  Handlers: {
    pick: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply()
      try {
        const entry = getWatchlist().random(interaction.guildId!)
        if (!entry) return await sendText(interaction, EMPTY)
        await sendContainer(interaction, buildPickContainer(entry))
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    pickReroll: async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate()
      try {
        const entry = getWatchlist().random(
          interaction.guildId!,
          idFrom(interaction.customId)
        )
        if (!entry) return await sendText(interaction, EMPTY)
        await sendContainer(interaction, buildPickContainer(entry))
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    // posts the warnings as a new message so the pick stays visible
    pickWarnings: async (interaction: ButtonInteraction) => {
      await interaction.deferReply()
      try {
        await sendContainer(
          interaction,
          await fetchWarningsContainer(idFrom(interaction.customId))
        )
      } catch (error) {
        await sendError(interaction, error)
      }
    },
  },
}
