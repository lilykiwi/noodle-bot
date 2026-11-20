import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js'

// handlers are keyed by command name or component customId, and each one
// receives whichever interaction type triggered it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InteractionHandler = (interaction: any) => Promise<void>

export type SlashCommand = {
  Builder: RESTPostAPIChatInputApplicationCommandsJSONBody
  Handlers: Record<string, InteractionHandler>
}
