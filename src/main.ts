import * as discord from 'discord.js'
import chalk from 'chalk'
import * as commands from './commands/index.js'
import * as types from './types'
import * as logging from './logging/logging.js'
import * as dotenv from 'dotenv'
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
      interaction.isButton()
    ) {
      commands.commandList.forEach((element) => {
        if (element.Handlers[interaction.customId]) {
          element.Handlers[interaction.customId](interaction)
        }
      })
    }
  }
)

// import tokens from dotenv
dotenv.config()

const TOKEN: string = process.env.TOKEN!
const APPID: string = process.env.APPID!

let commandsJSON: discord.RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
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
      default:
        prompt()
        return
    }
  })
}

registerCommands()
prompt()
