import {
  ButtonInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  InteractionContextType,
  MessageFlags,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  type Guild,
  type GuildScheduledEventCreateOptions,
} from 'discord.js'
import type * as types from '../types/index.js'
import { getWatchlist, type WatchlistEntry } from '../db/watchlist.js'
import { getItem } from '../dtdd/api.js'
import { dtddOptionsFromEnv, searchFilms } from '../dtdd/search.js'
import { truncate } from './filmFormat.js'
import { sendContainer, sendError, sendText } from './shared/reply.js'
import { nextNight, nightConfigFromEnv, parseWhen } from './movienightTime.js'
import {
  announcement,
  confirmStep,
  dayStep,
  entryFromItem,
  filmStep,
  parseState,
  pickerStep,
  searchModal,
  searchStep,
  whenModal,
  type WizardState,
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

// sat/sun are worked out fresh each step; impromptu nights carry their time
function startOf(state: WizardState) {
  return state.at != null
    ? new Date(state.at * 1000)
    : nextNight(state.day!, nightConfigFromEnv())
}

// watchlist films are already saved; searched films get fetched from dtdd
async function findFilm(guildId: string, id: number, picker: string) {
  const saved = getWatchlist().get(guildId, id)
  if (saved) return { entry: saved, onWatchlist: true }
  const item = await getItem(id, dtddOptionsFromEnv())
  return { entry: entryFromItem(item, guildId, picker), onWatchlist: false }
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
      await sendText(interaction, 'movie night setup cancelled')
    },

    mnDay: async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate()
      const state = parseState(interaction.customId)
      await sendContainer(interaction, pickerStep(state, startOf(state)))
    },

    // "another time": modals have to be the first response, so no defer
    mnCustom: async (interaction: ButtonInteraction) => {
      await interaction.showModal(whenModal())
    },

    mnWhen: async (interaction: ModalSubmitInteraction) => {
      await interaction.deferUpdate()
      const when = parseWhen(
        interaction.fields.getTextInputValue('date'),
        interaction.fields.getTextInputValue('time'),
        nightConfigFromEnv()
      )
      if ('error' in when) return await sendContainer(interaction, dayStep(when.error))
      const state = { at: Math.floor(when.at.getTime() / 1000) }
      await sendContainer(interaction, pickerStep(state, when.at))
    },

    mnPicker: async (interaction: UserSelectMenuInteraction) => {
      await interaction.deferUpdate()
      try {
        const state = { ...parseState(interaction.customId), picker: interaction.values[0] }
        const entries = getWatchlist().list(interaction.guildId!)
        await sendContainer(interaction, filmStep(state, startOf(state), entries))
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    mnSearchOpen: async (interaction: ButtonInteraction) => {
      await interaction.showModal(searchModal(parseState(interaction.customId)))
    },

    mnSearch: async (interaction: ModalSubmitInteraction) => {
      await interaction.deferUpdate()
      try {
        const state = parseState(interaction.customId)
        const result = await searchFilms(interaction.fields.getTextInputValue('query'))
        await sendContainer(interaction, searchStep(state, startOf(state), result))
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    // from the watchlist dropdown or from search results
    mnFilm: async (interaction: StringSelectMenuInteraction) => {
      await interaction.deferUpdate()
      try {
        const state = parseState(interaction.customId)
        const { entry, onWatchlist } = await findFilm(
          interaction.guildId!,
          Number(interaction.values[0]),
          state.picker!
        )
        await sendContainer(interaction, confirmStep(state, startOf(state), entry, onWatchlist))
      } catch (error) {
        await sendError(interaction, error)
      }
    },

    mnConfirm: async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate()
      try {
        const state = parseState(interaction.customId)
        const guild = interaction.guild!
        const start = startOf(state)
        if (start.getTime() <= Date.now()) {
          return await sendContainer(interaction, dayStep('that time has already passed, pick a new one'))
        }
        const { entry, onWatchlist } = await findFilm(guild.id, state.film!, state.picker!)

        const event = await createEvent(
          guild,
          entry,
          await displayName(guild, state.picker!),
          start
        )
        if (onWatchlist) getWatchlist().remove(guild.id, entry.dtddId)

        await sendText(
          interaction,
          onWatchlist
            ? `all set! **${entryTitle(entry)}** is off the watchlist and the event is up`
            : `all set! the event for **${entryTitle(entry)}** is up`
        )
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
