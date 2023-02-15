import { Client, Collection, Events, GatewayIntentBits, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from "discord.js";
import { config } from "dotenv";

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');

class movieBotClient extends Client {
	commands: any
}

// import token from dotenv
config();

// Create a new client instance
const client = new movieBotClient({ intents : [GatewayIntentBits.Guilds] });
client.commands = new Collection();

client.once(Events.ClientReady, () => {
	console.log('Ready!');
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'help') {
		await interaction.deferReply();
		await interaction.editReply('Read the slash commands you dork!');
	}
});

// Log in to Discord with your client's token
client.login(process.env.TOKEN);

const commands = [
new SlashCommandBuilder()
						.setName("help")
						.setDescription("Print help on how to use this bot")

];


var commandsJSON: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

commands.forEach(element => { commandsJSON.push(element.toJSON()) })

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(process.env.AppID),
			{ body: commandsJSON },
		);

		console.log(`Successfully reloaded ${data.length} application  commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();