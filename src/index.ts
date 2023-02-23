import { Client, Collection, Events, GatewayIntentBits, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandStringOption, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, StringSelectMenuBuilder, MessageComponentInteraction, spoiler, StringSelectMenuInteraction } from "discord.js";
import { config } from "dotenv";

class movieBotClient extends Client {
	commands: any
}

// import tokens from dotenv
config();

console.log("loading env variables");
let TOKEN: string = process.env.TOKEN!;
let APPID: string = process.env.APPID!;
let DDTDTOKEN: string = process.env.DDTDTOKEN!;

let DDTDheaders = new Headers({
	"Accept": "application/json",
	"X-API-KEY": DDTDTOKEN
});

interface filmItem {
	id: number,
	name: string,
	cleanName: string,
	genre: string,
	releaseYear: string,
	legacyId: number,
	legacyUserId: number,
	umId: number | null,
	legacyItemType: string,
	newsletterDate: Date | null,
	createdAt: Date,
	updatedAt: Date,
	UserId: number,
	ItemTypeId: number,
	tmdbId: number,
	imdbId: number | null,
	backgroundImage: string | null,
	posterImage: string | null,
	tmdbResult: null,
	overview: string,
	itemType: {
		id: number,
		name: string
	},
	itemTypeId: number
}

interface DTDDSearchResponse {
	items: Array<filmItem>
}

interface comment {
	id: number,
	voteSum: number,
	comment: string,
	User: {
		id: number,
		displayName: string
	}
}

interface topicItem {
	id: number,
	name: string,
	notName: string,
	keywords: string | null,
	description: string | null,
	subtitle: string | null,
	subtitleText: string | null,
	subtitleUrl: string | null,
	doesName: string,
	listName: string,
	image: string,
	ordering: number,
	isSpoiler: boolean,
	isVisible: boolean,
	isSensitive: boolean,
	smmwDescription: string,
	legacyId: number,
	createdAt: Date,
	updatedAt: Date
}

interface topicItemStats { //this is broken for some reason?
	topicItemId: number,
	newslatterDate: Date | null,
	yesSum: number,
	noSum: number,
	numComments: number,
	TopicId: number,
	ItemId: number,
	RatingId: number,
	commentUserIds: string,
	voteSum: number,
	comment: string,
	isAnonymous: number,
	username: string,
	UserId: number,
	verified: number,
	itemName: string,
	itemCleanName: string,
	releaseYear: number,
	itemTypeName: string,
	itemTypeSlug: string,
	itemTypeId: number,
	isYes: number,
	hasUserComment: boolean,
	itemId: number | null,
	comments: Array<comment>,
	topic: topicItem,
}

interface DTDDFilmResponse {
	item: filmItem,
	topicItemStats: Array<topicItemStats>,
}

// Create a new client instance
console.log("constructing client");
const client = new movieBotClient({ intents : [GatewayIntentBits.Guilds] });
client.commands = new Collection();

client.once(Events.ClientReady, () => {
	console.log('Ready!');
});

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) {
		switch (interaction.commandName) {
			case 'help': await help(interaction)
			case 'film': await film(interaction)
			default:
				break;
		}
	}

	if (interaction.isStringSelectMenu()) {
		await getTagsForMovie(interaction);
	}
});

async function help(interaction:ChatInputCommandInteraction) {
	await interaction.deferReply();
	await interaction.editReply('Read the slash commands you dork!');
}

async function film(interaction:ChatInputCommandInteraction) {
	await interaction.deferReply();
	let query = interaction.options.getString("query");

	let replyEmbed = new EmbedBuilder()
		.setColor("#96152c")
		.setTitle("Search Results")

  let resp = await fetch('https://www.doesthedogdie.com/dddsearch?q=' + query, {
		method: 'GET', 
		cache: 'no-cache',
		headers: DDTDheaders
	});
	let response = <DTDDSearchResponse>(await resp.json());

	if (response.items.length > 0) {
		// more than 25 results, we need to do pagination or something.

		//replyEmbed.addFields({
		//	inline: false,
		//	name: "More than 5 results",
		//	value: "ping <@583325947022016523> (@lilykiwi#9911) lmao"
		//})

		const row = new ActionRowBuilder<ButtonBuilder>();
		const selectMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>();

		const selectMenu: StringSelectMenuBuilder = new StringSelectMenuBuilder()
			.setCustomId('select')
			.setPlaceholder(`${response.items.length} results found`);

		try {
			for (let index = 0; index < response.items.length; index++) {
				const film = response.items[index];
				let descriptionValue = ""
				let filmName = ""
				if (film.name) {
					filmName = film.name.substring(0,92);
					if (film.name.length > 92) {
						filmName = film.name.substring(0,89);
						filmName += "...";
					}
				}
				if (film.overview) {
					descriptionValue = film.overview.substring(0,97);
					if (film.overview.length > 97) {
						descriptionValue = film.overview.substring(0,94);
						descriptionValue += "...";
					}
				} else {
					descriptionValue = "no description provided";
				}
				selectMenu.addOptions({
					label: `${filmName} (${film.releaseYear})`,
					description: `${descriptionValue}`,
					value: `${film.id}`
				});
			}
		} catch (error) {
			console.log(error);
			await interaction.editReply("This operation failed! ping <@583325947022016523>");
		}

		try {
			selectMenuRow.addComponents(selectMenu);
			await interaction.editReply({ components: [selectMenuRow] });
		} catch (error) {
			console.log(error);
			await interaction.editReply("This operation failed! ping <@583325947022016523>");
		}
	}

	if (response.items.length == 0) {
		replyEmbed.addFields({
			inline: false,
			name: "No results found",
			value: "Try another search term maybe?"
		})
		await interaction.editReply({ embeds: [replyEmbed] })
	}
}

async function getTagsForMovie(interaction:StringSelectMenuInteraction) {
	// defer so discord is happy
	await interaction.deferUpdate();

	if (interaction.values[0]) {
		// search DDTD for the specific movie, as we have an ID now.
		let query = interaction.values[0];
		let resp = await fetch('https://www.doesthedogdie.com/media/' + query, {
			method: 'GET', 
			cache: 'no-cache',
			headers: DDTDheaders
		});
		let response = <DTDDFilmResponse>(await resp.json());

		let filmName = ""
		filmName = response.item.name.substring(0,92);
		if (response.item.name.length > 92) {
			filmName = response.item.name.substring(0,89);
			filmName += "...";
		}

		let replyEmbed = new EmbedBuilder()
			.setColor("#96152c")
			.setTitle(`${filmName} (${response.item.releaseYear})`)
			.setURL('https://www.doesthedogdie.com/media/' + query);

		let numResults = 0;

		if (response.topicItemStats.length > 0) {
			for (let index = 0; index < Math.min(response.topicItemStats.length, 25); index++) {
				const element = response.topicItemStats[index];

				let topicName = ""

				if (element.topic.isSpoiler || element.topic.isSensitive) {
					topicName = spoiler(`${element.topic.name}`);
				} else {
					topicName = `${element.topic.name}`;
				}
				if (element.yesSum > element.noSum) {
					replyEmbed.addFields({
						inline: true,
						name: topicName,
						value: `${element.yesSum}+ ${element.noSum}-`
					});
					numResults++;
				}
			}
		} 

		if (numResults < 1) {
			replyEmbed.addFields({
				inline: false,
				name: "Nobody has added any votes for this film!",
				value: `oops`
			});
		}

		await interaction.editReply({ embeds: [replyEmbed], components: [] });
	} else {
		// we shouldn't get here but just in case
		console.log("error: interaction.customId is null or something?");

		let replyEmbed = new EmbedBuilder()
			.setColor("#96152c")
			.setTitle(`something broke lol`)
			.addFields({
				inline: true,
				name: "something went wrong?",
				value: "talk to <@583325947022016523> lol"
			})
		await interaction.editReply({ embeds: [replyEmbed], components: [] });
	}
}

// Log in to Discord with your client's token
console.log("logging in")
client.login(TOKEN);

console.log("initialising commands")

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
const rest = new REST({ version: '10' }).setToken(TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing application commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(APPID),
			{ body: commandsJSON },
		);

		console.log(`Successfully reloaded application  commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();