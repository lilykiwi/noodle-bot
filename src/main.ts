import * as discord from 'discord.js'
import chalk from 'chalk'
import * as commands from './commands/index.js'
import type * as types from './types/index.js'
import * as logging from './logging/logging.js'
import readline from 'node:readline'

const client = new discord.Client({
  intents: [discord.GatewayIntentBits.Guilds],
})

client.once(discord.Events.ClientReady, () => {
  const date = new Date()
  const dateString = chalk.cyan(date.toLocaleString())
  console.log(chalk.green(`- Bot online! - ${dateString}`))
})

client.on(
  discord.Events.InteractionCreate,
  async (interaction: discord.BaseInteraction<discord.CacheType>) => {
    // autocomplete has a 3s deadline, so handle it before (slow) logging
    if (interaction.isAutocomplete()) {
      for (const command of commands.commandList) {
        await command.Autocomplete?.[interaction.commandName]?.(interaction)
      }
      return
    }

    await logging.generateLogString(interaction)

    if (interaction.isChatInputCommand()) {
      commands.commandList.forEach((element) => {
        if (element.Handlers[interaction.commandName]) {
          element.Handlers[interaction.commandName](interaction)
        }
      })
    }

    // NOTE: this is a handler for DM messages, todo ig.
    //if (interaction.channel?.isDMBased()) {
    //  commands.commandList.forEach((element) => {
    //    if (element.Handlers[interaction.commandName]) {
    //      element.Handlers[interaction.commandName](interaction);
    //    }
    //  });
    //}

    if (
      interaction.isStringSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isUserSelectMenu() ||
      interaction.isButton()
    ) {
      // customIds can carry data after a colon, e.g. "pickReroll:10752"
      const key = interaction.customId.split(':')[0]
      commands.commandList.forEach((element) => {
        if (element.Handlers[key]) {
          element.Handlers[key](interaction)
        }
      })
    }
  }
)

const TOKEN: string = process.env.TOKEN!
const APPID: string = process.env.APPID!

const commandsJSON: discord.RESTPostAPIChatInputApplicationCommandsJSONBody[] =
  []
commands.commandList.forEach((command: types.SlashCommand) => {
  console.log(`- found command ${chalk.cyan(command.Builder.name)}`)
  commandsJSON.push(command.Builder)
})

// Log in to Discord with your client's token
client.login(TOKEN)

// Construct and prepare an instance of the REST module
const rest = new discord.REST({ version: '10' }).setToken(TOKEN)

// Deploy commands
async function registerCommands() {
  try {
    console.log(
      `Refreshing ${chalk.redBright(commandsJSON.length)} command(s)...`
    )
    // fully refreshes all commands in the guild with the current set
    await rest.put(discord.Routes.applicationCommands(APPID), {
      body: commandsJSON,
    })
  } catch (error) {
    console.error(error)
  }
}

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function prompt() {
  input.question('', (answer) => {
    switch (answer) {
      case 'restart':
      case 'kill':
        console.log(chalk.red('Killing client...'))
        client.destroy()
        process.exit()
        break
      default:
        prompt()
        return
    }
  })
}

registerCommands()
prompt()
