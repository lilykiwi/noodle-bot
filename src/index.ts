import { CacheType, Client, Collection, Events, GatewayIntentBits, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, APIEmbedField, SlashCommandStringOption } from "discord.js";
import { config } from "dotenv";

const { REST, Routes } = require('discord.js');
const tiny = require('tiny-json-http')

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

	switch (interaction.commandName) {
		case 'help': await help(interaction)
		case 'film': await film(interaction)
		default:
			break;
	}
});

async function help(interaction:ChatInputCommandInteraction) {
	await interaction.deferReply();
	await interaction.editReply('Read the slash commands you dork!');
}

async function film(interaction:ChatInputCommandInteraction) {
	await interaction.deferReply();
	let query = interaction.options.getString("query");

	//let replyEmbed = new EmbedBuilder()
	//.setColor("#96152c")
	//.setTitle("Search Results")
	//.setDescription("This is a placeholder sorry this system is messy i might add buttons soon lol");

	await tiny.get({
			url: "https://www.doesthedogdie.com/dddsearch?q=" + query,
			headers: {
				"Accept": "application/json",
				"X-API-KEY": process.env.DDTDTOKEN
			}
		}, async function _get(err: Error, result: { body: any; } ) {
			if (err) {
				console.log('ruh roh!', err)
				await interaction.editReply("woopsie we did a fucky wucky the search broke please ping @lilykiwi#9911")

				return
			}
			else {
				console.log(result.body)
				await interaction.editReply("woopsie we did a fucky wucky the search broke please ping @lilykiwi#9911")

				return

				//await interaction.deleteReply();
				//if (channel) await channel.send({ embeds: [replyEmbed] });
			}
		}
	)
	//response.forEach((result: { name: string; year: string }) => {
	//	let field: APIEmbedField[] = [{"inline": true, "name": result.name, "value": result.year}];
	//	replyEmbed.addFields(field) 
	//});

	await interaction.editReply("woopsie we did a fucky wucky the search broke please ping @lilykiwi#9911")
}

// Log in to Discord with your client's token
client.login(process.env.TOKEN);


const helpCommand =	new SlashCommandBuilder()
			.setName("help")
			.setDescription("Print help on how to use this bot");
const filmCommand =	new SlashCommandBuilder()
			.setName("film")
			.setDescription("Search for a movie")
			.addStringOption(new SlashCommandStringOption()
											.setName("query")
											.setDescription("The name of the movie to search for")
											.setRequired(true)
			);
			

var commandsJSON: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

commandsJSON.push(helpCommand.toJSON());
commandsJSON.push(filmCommand.toJSON());

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing application commands.`);

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