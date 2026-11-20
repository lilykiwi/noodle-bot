// the /movienight wizard screens. every choice so far rides along in the
// component customIds (e.g. "mnFilm:sat:1234"), so no state is kept in
// memory and a bot restart mid-wizard doesn't break anything
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js'
import type { WatchlistEntry } from '../db/watchlist.js'
import { truncate } from './filmFormat.js'
import { ACCENT } from './shared/searchUi.js'
import { DAY_LABEL, discordTime, type NightDay } from './movienightTime.js'
import { entryLinks, entryTitle, imageUrl } from './watchlistFormat.js'

export interface WizardState {
  day?: NightDay
  picker?: string
  film?: number
}

export function parseState(customId: string): WizardState {
  const [, day, picker, film] = customId.split(':')
  return {
    day: day == 'sat' || day == 'sun' ? day : undefined,
    picker: picker || undefined,
    film: film ? Number(film) : undefined,
  }
}

function summary(state: WizardState, start?: Date) {
  const lines = ['## 🎬 movie night setup']
  if (state.day)
    lines.push(`📅 ${start ? discordTime(start) : DAY_LABEL[state.day]}`)
  if (state.picker) lines.push(`🧑 <@${state.picker}>'s pick`)
  return lines.join('\n')
}

const cancelButton = () =>
  new ButtonBuilder()
    .setCustomId('mnCancel')
    .setLabel('cancel')
    .setStyle(ButtonStyle.Secondary)

export function dayStep(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents((t) =>
      t.setContent(`${summary({})}\nwhich day is it? 📅`)
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
        cancelButton()
      )
    )
}

export function pickerStep(state: WizardState, start: Date): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(ACCENT)
    .addTextDisplayComponents((t) =>
      t.setContent(`${summary(state, start)}\nwhose pick is it? 🧑`)
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`mnPicker:${state.day}`)
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
    return reply.addTextDisplayComponents((t) =>
      t.setContent(
        `${summary(state, start)}\nthe watchlist is empty! add something with \`/watchlist add\` first 🍿`
      )
    )
  }
  const more =
    entries.length > ordered.length
      ? `\n-# showing ${ordered.length} of ${entries.length} films`
      : ''
  return reply
    .addTextDisplayComponents((t) =>
      t.setContent(`${summary(state, start)}\nwhich film? 🎬${more}`)
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`mnFilm:${state.day}:${state.picker}`)
          .setPlaceholder('choose from the watchlist')
          .addOptions(
            ordered.map((e) => ({
              label: truncate(entryTitle(e), 100),
              value: String(e.dtddId),
              description: e.addedBy == state.picker ? 'their suggestion ✨' : undefined,
            }))
          )
      )
    )
    .addActionRowComponents((row) => row.addComponents(cancelButton()))
}

export function confirmStep(
  state: WizardState,
  start: Date,
  entry: WatchlistEntry
): ContainerBuilder {
  const reply = new ContainerBuilder().setAccentColor(ACCENT)
  const image = imageUrl(entry.backgroundImage, entry.posterImage)
  if (image) {
    reply.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(image)))
  }
  return reply
    .addTextDisplayComponents((t) =>
      t.setContent(
        `${summary(state, start)}\n🍿 **${entryTitle(entry)}**\n${entryLinks(entry)}\n\nlook good? this creates the event and posts an announcement`
      )
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mnConfirm:${state.day}:${state.picker}:${entry.dtddId}`)
          .setLabel('create event')
          .setEmoji('✅')
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
