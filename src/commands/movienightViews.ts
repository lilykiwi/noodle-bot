// the /movienight wizard screens. every choice so far rides along in the
// component customIds (e.g. "mnFilm:sat:1234"), so no state is kept in
// memory and a bot restart mid-wizard doesn't break anything.
// the wizard is ephemeral and kept emoji-free; only the public
// announcement gets the cute stuff
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from 'discord.js'
import type { WatchlistEntry } from '../db/watchlist.js'
import type { DTDDItem } from '../dtdd/api.js'
import type { SearchResult } from '../dtdd/search.js'
import { truncate } from './filmFormat.js'
import { ACCENT, buildSearchContainer } from './shared/searchUi.js'
import { DAY_LABEL, discordTime, type NightDay } from './movienightTime.js'
import { entryLinks, entryTitle, imageUrl } from './watchlistFormat.js'

export interface WizardState {
  day?: NightDay
  // impromptu nights: an exact start time, in unix seconds
  at?: number
  picker?: string
  film?: number
}

// the "when" part of a customId: "sat", "sun" or "t<unix seconds>"
export function whenToken(state: WizardState) {
  return state.at != null ? `t${state.at}` : (state.day ?? '')
}

export function parseState(customId: string): WizardState {
  const [, when, picker, film] = customId.split(':')
  const at = /^t\d+$/.test(when ?? '') ? Number(when.slice(1)) : undefined
  return {
    day: when == 'sat' || when == 'sun' ? when : undefined,
    at,
    picker: picker || undefined,
    film: film ? Number(film) : undefined,
  }
}

export const hasWhen = (s: WizardState) => s.day != null || s.at != null

// a film picked by search rather than from the watchlist, shaped like an
// entry so the rest of the wizard doesn't care where it came from
export function entryFromItem(
  item: DTDDItem,
  guildId: string,
  addedBy: string
): WatchlistEntry {
  return {
    guildId,
    dtddId: item.id,
    name: item.name,
    releaseYear: item.releaseYear ?? null,
    tmdbId: item.tmdbId ?? null,
    imdbId: item.imdbId ?? null,
    posterImage: item.posterImage ?? null,
    backgroundImage: item.backgroundImage ?? null,
    addedBy,
    addedAt: Date.now(),
  }
}

function summary(state: WizardState, start?: Date) {
  const lines = ['## movie night setup']
  if (start) lines.push(`**when:** ${discordTime(start)}`)
  else if (state.day) lines.push(`**when:** ${DAY_LABEL[state.day]}`)
  if (state.picker) lines.push(`**pick:** <@${state.picker}>`)
  return lines.join('\n')
}

const cancelButton = () =>
  new ButtonBuilder()
    .setCustomId('mnCancel')
    .setLabel('cancel')
    .setStyle(ButtonStyle.Secondary)

const searchButton = (state: WizardState, label = 'search for a film') =>
  new ButtonBuilder()
    .setCustomId(`mnSearchOpen:${whenToken(state)}:${state.picker}`)
    .setLabel(label)
    .setStyle(ButtonStyle.Primary)

export function whenModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId('mnWhen')
    .setTitle('impromptu movie night')
    .addLabelComponents(
      (l) =>
        l
          .setLabel('day')
          .setDescription('today, tomorrow, a weekday, 27/11 or 2026-11-27')
          .setTextInputComponent((i) =>
            i
              .setCustomId('date')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('today')
              .setRequired(false)
              .setMaxLength(20)
          ),
      (l) =>
        l
          .setLabel('time')
          .setDescription('like 21:00 or 9pm. blank = the usual time')
          .setTextInputComponent((i) =>
            i
              .setCustomId('time')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('21:00')
              .setRequired(false)
              .setMaxLength(10)
          )
    )
}

export function searchModal(state: WizardState): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`mnSearch:${whenToken(state)}:${state.picker}`)
    .setTitle('search for a film')
    .addLabelComponents((l) =>
      l
        .setLabel('film name')
        .setDescription('add a year to narrow it down, like halloween 1978')
        .setTextInputComponent((i) =>
          i
            .setCustomId('query')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
        )
    )
}

export function dayStep(error?: string): ContainerBuilder {
  const note = error ? `\n> ${error}` : ''
  return new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents((t) =>
      t.setContent(`${summary({})}\nwhich day is it?${note}`)
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mnDay:sat')
          .setLabel('Saturday')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mnDay:sun')
          .setLabel('Sunday')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('mnCustom')
          .setLabel('another time')
          .setStyle(ButtonStyle.Secondary),
        cancelButton()
      )
    )
}

export function pickerStep(state: WizardState, start: Date): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents((t) =>
      t.setContent(`${summary(state, start)}\nwhose pick is it?`)
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`mnPicker:${whenToken(state)}`)
          .setPlaceholder('choose a person')
      )
    )
    .addActionRowComponents((row) => row.addComponents(cancelButton()))
}

// the picker's own suggestions go first, then everything else oldest first
export function orderForPicker(entries: WatchlistEntry[], picker: string) {
  return [
    ...entries.filter((e) => e.addedBy == picker),
    ...entries.filter((e) => e.addedBy != picker),
  ]
}

export function filmStep(
  state: WizardState,
  start: Date,
  entries: WatchlistEntry[]
): ContainerBuilder {
  const ordered = orderForPicker(entries, state.picker!).slice(0, 25)
  const reply = new ContainerBuilder().setAccentColor(ACCENT)

  if (ordered.length == 0) {
    return reply
      .addTextDisplayComponents((t) =>
        t.setContent(
          `${summary(state, start)}\nthe watchlist is empty, so search for the film instead`
        )
      )
      .addActionRowComponents((row) =>
        row.addComponents(searchButton(state), cancelButton())
      )
  }

  const more =
    entries.length > ordered.length
      ? `\n-# showing ${ordered.length} of ${entries.length} films`
      : ''
  return reply
    .addTextDisplayComponents((t) =>
      t.setContent(
        `${summary(state, start)}\nwhich film? pick from the watchlist or search${more}`
      )
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`mnFilm:${whenToken(state)}:${state.picker}`)
          .setPlaceholder('choose from the watchlist')
          .addOptions(
            ordered.map((e) => ({
              label: truncate(entryTitle(e), 100),
              value: String(e.dtddId),
              description:
                e.addedBy == state.picker ? 'their suggestion' : undefined,
            }))
          )
      )
    )
    .addActionRowComponents((row) =>
      row.addComponents(searchButton(state), cancelButton())
    )
}

// search results, using the same picker as /film and /watchlist add
export function searchStep(
  state: WizardState,
  start: Date,
  result: SearchResult
): ContainerBuilder {
  return buildSearchContainer(result, {
    customId: `mnFilm:${whenToken(state)}:${state.picker}`,
    prompt: `${summary(state, start)}\nwhich one?`,
  }).addActionRowComponents((row) =>
    row.addComponents(searchButton(state, 'search again'), cancelButton())
  )
}

export function confirmStep(
  state: WizardState,
  start: Date,
  entry: WatchlistEntry,
  onWatchlist: boolean
): ContainerBuilder {
  const reply = new ContainerBuilder().setAccentColor(ACCENT)
  const image = imageUrl(entry.backgroundImage, entry.posterImage)
  if (image) {
    reply.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(image)))
  }
  const after = onWatchlist
    ? 'this creates the event, posts an announcement and takes it off the watchlist'
    : 'this creates the event and posts an announcement'
  return reply
    .addTextDisplayComponents((t) =>
      t.setContent(
        `${summary(state, start)}\n**film:** ${entryTitle(entry)}\n${entryLinks(entry)}\n\nlook good? ${after}`
      )
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            `mnConfirm:${whenToken(state)}:${state.picker}:${entry.dtddId}`
          )
          .setLabel('create event')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('mnStart')
          .setLabel('start over')
          .setStyle(ButtonStyle.Secondary),
        cancelButton()
      )
    )
}

export function announcement(
  entry: WatchlistEntry,
  picker: string,
  start: Date,
  eventUrl: string | null
): ContainerBuilder {
  const reply = new ContainerBuilder().setAccentColor(ACCENT)
  const image = imageUrl(entry.backgroundImage, entry.posterImage)
  if (image) {
    reply.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(image)))
  }
  const event = eventUrl ? `\n[📅 event](${eventUrl})` : ''
  return reply
    .addTextDisplayComponents((t) =>
      t.setContent(
        `# 🍿 movie night: ${entryTitle(entry)}\n` +
          `${discordTime(start)} (${discordTime(start, 'R')})\n` +
          `<@${picker}>'s pick · ${entryLinks(entry)}${event}`
      )
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`pickWarnings:${entry.dtddId}`)
          .setLabel('content warnings')
          .setEmoji('⚠️')
          .setStyle(ButtonStyle.Secondary)
      )
    )
}
