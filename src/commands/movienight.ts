import {
  ButtonInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  type Guild,
  type GuildScheduledEventCreateOptions,
} from 'discord.js'
import type * as types from '../types/index.js'
import { getWatchlist, type WatchlistEntry } from '../db/watchlist.js'
import { truncate } from './filmFormat.js'
import { sendContainer, sendError, sendText } from './shared/reply.js'
import { nextNight, nightConfigFromEnv } from './movienightTime.js'
import {
  announcement,
  confirmStep,
  dayStep,
  filmStep,
  parseState,
  pickerStep,
} from './movienightViews.js'
import { entryLinks, entryTitle, imageUrl } from './watchlistFormat.js'

async function createEvent(
  guild: Guild,
  entry: WatchlistEntry,
  pickerName: string,
  start: Date
) {
  const cfg = nightConfigFromEnv()
  const end = new Date(start.getTime() + cfg.durationHours * 3600_000)
  const channelId = process.env.MOVIENIGHT_CHANNEL_ID

  const options: GuildScheduledEventCreateOptions = {
    name: truncate(`🍿 ${entryTitle(entry)}`, 100),
    description: truncate(`${pickerName}'s pick!\n${entryLinks(entry)}`, 1000),
    scheduledStartTime: start,
    scheduledEndTime: end,
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    entityType: GuildScheduledEventEntityType.External,
    entityMetadata: { location: process.env.MOVIENIGHT_LOCATION || 'movie night 🍿' },
  }

  // with a voice/stage channel configured, host the event there instead
  if (channelId) {
    const channel = await guild.channels.fetch(channelId)
    options.channel = channelId
    options.entityMetadata = undefined
    options.entityType =
      channel?.type == ChannelType.GuildStageVoice
        ? GuildScheduledEventEntityType.StageInstance
        : GuildScheduledEventEntityType.Voice
  }

  const image = imageUrl(entry.backgroundImage, entry.posterImage)
  if (image) {
    try {
      return await guild.scheduledEvents.create({ ...options, image })
    } catch (error) {
      // a broken cover image shouldn't stop movie night
      console.error('event image failed, retrying without it', error)
    }
  }
  return await guild.scheduledEvents.create(options)
}

async function displayName(guild: Guild, userId: string) {
  try {
    return (await guild.members.fetch(userId)).displayName
  } catch {
    return 'someone'
  }
}

export const movienight: types.SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName('movienight')
    .setDescription('Set up movie night: day, whose pick, and the film')
    .setContexts(InteractionContextType.Guild)
    .toJSON(),

  Handlers: {
    movienight: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      await sendContainer(interaction, dayStep())
    },

    mnStart: async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate()
      await sendContainer(interaction, dayStep())
    },

    mnCancel: async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate()
      await sendText(interaction, 'movie night setup cancelled 🐾')
    },

    mnDay: async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate()
      const state = parseState(interaction.customId)
      const start = nextNight(state.day!, nightConfigFromEnv())
      await sendContainer(interaction, pickerStep(state, start))
    },

    mnPicker: async (interaction: UserSelectMenuInteraction) => {
      await interaction.deferUpdate()
      try {
        const state = { ...parseState(interaction.customId), picker: interaction.values[0] }
        const start = nextNight(state.day!, nightConfigFromEnv())
        const entries = getWatchlist().list(interaction.guildId!)
        await sendContainer(interaction, filmStep(state, start, entries))
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    mnFilm: async (interaction: StringSelectMenuInteraction) => {
      await interaction.deferUpdate()
      try {
        const state = parseState(interaction.customId)
        const entry = getWatchlist().get(interaction.guildId!, Number(interaction.values[0]))
        if (!entry) return await sendText(interaction, 'that film left the watchlist! try again 🐾')
        const start = nextNight(state.day!, nightConfigFromEnv())
        await sendContainer(interaction, confirmStep(state, start, entry))
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    mnConfirm: async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate()
      try {
        const state = parseState(interaction.customId)
        const guild = interaction.guild!
        const store = getWatchlist()
        const entry = store.get(guild.id, state.film!)
        if (!entry) return await sendText(interaction, 'that film left the watchlist! try again 🐾')

        const start = nextNight(state.day!, nightConfigFromEnv())
        const event = await createEvent(
          guild,
          entry,
          await displayName(guild, state.picker!),
          start
        )
        store.remove(guild.id, entry.dtddId)

        await sendText(interaction, `all set! ✨ **${entryTitle(entry)}** is off the watchlist and the event is up`)
        await interaction.followUp({
          components: [announcement(entry, state.picker!, start, event.url)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        })
      } catch (error) {
        await sendError(interaction, error)
      }
    },
  },
}
