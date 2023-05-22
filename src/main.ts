import {
  Client,
  Events,
  GatewayIntentBits,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  REST,
  Routes,
  CacheType,
  BaseInteraction,
} from "discord.js";
import chalk from "chalk";
import { commandList } from "./commands/_index";
import { SlashCommand } from "./types";
import { generateLogString } from "./logging/logging";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  const date = new Date();
  const dateString = chalk.cyan(date.toLocaleString());
  console.log(chalk.green(`- Bot online! - ${dateString}`));
});

client.on(
  Events.InteractionCreate,
  async (interaction: BaseInteraction<CacheType>) => {
    await generateLogString(interaction);

    if (interaction.isChatInputCommand()) {
      commandList.forEach((element) => {
        if (element.Handlers[interaction.commandName]) {
          element.Handlers[interaction.commandName](interaction);
        }
      });
    }

    if (
      interaction.isStringSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isButton()
    ) {
      commandList.forEach((element) => {
        if (element.Handlers[interaction.customId]) {
          element.Handlers[interaction.customId](interaction);
        }
      });
    }
  }
);

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
