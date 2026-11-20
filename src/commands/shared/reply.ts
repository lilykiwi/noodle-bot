import {
  ContainerBuilder,
  MessageFlags,
  type RepliableInteraction,
} from 'discord.js'
import { describeError } from '../filmFormat.js'
import { ACCENT } from './searchUi.js'

// every reply in this bot is a components v2 container on a deferred interaction
export async function sendContainer(
  interaction: RepliableInteraction,
  container: ContainerBuilder
) {
  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    // show <@user> mentions without actually pinging anyone
    allowedMentions: { parse: [] },
  })
}

export function textContainer(text: string, accent = ACCENT) {
  return new ContainerBuilder()
    .setAccentColor(accent)
    .addTextDisplayComponents((t) => t.setContent(text))
}

export async function sendText(interaction: RepliableInteraction, text: string) {
  await sendContainer(interaction, textContainer(text))
}

export async function sendError(
  interaction: RepliableInteraction,
  error: unknown
) {
  console.error(error)
  try {
    await sendContainer(interaction, textContainer(describeError(error), 0xff4444))
  } catch (e) {
    console.error(e)
  }
}
