import {
  Client,
  Events,
  GatewayIntentBits,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  REST,
  Routes,
  TextChannel,
  Interaction,
  CacheType,
} from "discord.js";
import chalk from "chalk";
import { commandList } from "./commands/_index";
import { SlashCommand } from "./types";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  const date = new Date();
  const dateString = chalk.cyan(date.toLocaleString());
  console.log(chalk.green(`- Bot online! - ${dateString}`));
});

client.on(Events.InteractionCreate, async (interaction) => {
  await generateLogString(interaction);

  if (interaction.isChatInputCommand()) {
    commandList.forEach((element) => {
      if (
        interaction.commandName === element.Builder.name &&
        element.InputCommandHandler
      )
        element.InputCommandHandler(interaction);
    });
  }

  if (interaction.isStringSelectMenu()) {
    commandList.forEach((element) => {
      if (
        interaction.customId === element.Builder.name &&
        element.StringSelectMenuHandler
      )
        element.StringSelectMenuHandler(interaction);
    });
  }
});

async function generateLogString(interaction: Interaction) {
  let subjectId,
    message,
    channelString,
    query,
    user = `@${interaction.user.username}#${interaction.user.discriminator}`,
    date = new Date();

  if (interaction.channel?.isTextBased && interaction.guild) {
    const channel = <TextChannel>await interaction.channel.fetch();
    channelString = `${interaction.guild.name}/#${channel.name}`;
  }

  if (interaction.channel?.isDMBased && !interaction.guild) {
    channelString = `Direct Message`;
  }

  if (interaction.isChatInputCommand()) {
    subjectId = `/${interaction.commandName}`;
    message = "command";
    let queryString = interaction.options.getString("query");
    if (queryString) subjectId += " " + queryString;
  }

  if (interaction.isStringSelectMenu()) {
    subjectId = interaction.customId;
    message = "select menu (string)";
    if (interaction.values) subjectId += " " + interaction.values;
  }

  message = chalk.red(message);
  user = chalk.green(user);
  query = chalk.yellow(query);
  channelString = chalk.bold.blue(channelString);
  let dateString = chalk.cyan(date.getHours() + ":" + date.getMinutes());
  subjectId = chalk.underline(subjectId);

  console.log(`${dateString} ${message}: ${subjectId} ${query} from ${user}`);
  console.log(`      -> in ${channelString}`);
}

// import tokens from dotenv
require("dotenv").config();

const TOKEN: string = process.env.TOKEN!;
const APPID: string = process.env.APPID!;

let commandsJSON: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
commandList.forEach((command: SlashCommand) => {
  commandsJSON.push(command.Builder);
});

// Log in to Discord with your client's token
client.login(TOKEN);

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`Refreshing ${chalk.bold(commandsJSON.length)} commands`);
    // fully refreshes all commands in the guild with the current set
    await rest.put(Routes.applicationCommands(APPID), {
      body: commandsJSON,
    });
  } catch (error) {
    console.error(error);
  }
})();
