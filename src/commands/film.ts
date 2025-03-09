import * as discord from "discord.js";
import * as types from "../types";
import * as fetch from "node-fetch";

let DDTDTOKEN: string = process.env.DDTDTOKEN!;
let DDTDheaders = {
  Accept: "application/json",
  "X-API-KEY": DDTDTOKEN,
};

async function filmSearch(query: string, interaction: discord.ChatInputCommandInteraction | discord.StringSelectMenuInteraction) {

  let replyEmbed = new discord.EmbedBuilder()
    .setColor("#96152c")
    .setTitle("Search Results");

  let resp = await fetch.default(
    "https://www.doesthedogdie.com/dddsearch?q=" + encodeURI(query),
    {
      method: "GET",
      headers: DDTDheaders,
    }
  );
  let response = <types.DTDDSearchResponse>await resp.json();

  if (response.items.length > 0) {
    const row = new discord.ActionRowBuilder<discord.ButtonBuilder>();
    const selectMenuRow = new discord.ActionRowBuilder<discord.StringSelectMenuBuilder>();

    const selectMenu: discord.StringSelectMenuBuilder = new discord.StringSelectMenuBuilder()
      .setCustomId("filmSelectID")
      .setPlaceholder(`${response.items.length} results found`);

    try {
      for (let index = 0; index < response.items.length; index++) {
        const film = response.items[index];
        let descriptionValue = "";
        let filmName = "";
        if (film.releaseYear == "Unknown") {
          film.releaseYear = "????";
        }
        if (film.name) {
          filmName = film.name.substring(0, 19);
          // FIXME: truncate length is hardcoded here, should be calculated instead.
          if (film.name.length > 19) {
            filmName = film.name.substring(0, 16);
            filmName += "...";
          }
        }
        if (film.overview) {
          descriptionValue = film.overview.substring(0, 100);
          if (film.overview.length > 100) {
            descriptionValue = film.overview.substring(0, 97);
            descriptionValue += "...";
          }
        } else {
          descriptionValue = "no description provided";
        }
        selectMenu.addOptions({
          label: `${filmName} (${film.releaseYear})`,
          description: `${descriptionValue}`,
          value: `${film.id}`,
        });
      }
    } catch (error) {
      console.log(error);
      await interaction.editReply(
        "Something went wrong! ping <@583325947022016523>"
      );
    }

    try {
      selectMenuRow.addComponents(selectMenu);
      await interaction.editReply({ components: [selectMenuRow] });
    } catch (error) {
      console.log(error);
      await interaction.editReply(
        "Something went wrong! ping <@583325947022016523>"
      );
    }
  }

  if (response.items.length == 0) {
    replyEmbed.addFields({
      inline: false,
      name: "No results found",
      value: "Try another search term maybe?",
    });
    await interaction.editReply({ embeds: [replyEmbed] });
  }
}

async function filmSelectID(query: string, interaction: discord.ChatInputCommandInteraction | discord.StringSelectMenuInteraction) {

  let resp = await fetch.default("https://www.doesthedogdie.com/media/" + encodeURI(query), {
    method: "GET",
    headers: DDTDheaders,
  });
  let response = <types.DTDDFilmResponse>await resp.json();

  let filmName = "";
  filmName = response.item.name.substring(0, 92);
  if (response.item.name.length > 92) {
    filmName = response.item.name.substring(0, 89);
    filmName += "...";
  }

  let replyEmbed = new discord.EmbedBuilder()
    .setColor("#96152c")
    .setTitle(`${filmName} (${response.item.releaseYear})`)
    .setURL("https://www.doesthedogdie.com/media/" + encodeURI(query));

  let numResults = 0;

  if (response.topicItemStats.length > 0) {
    let i = 0;
    while (numResults < 25) {
      if (response.topicItemStats[i] === undefined) {
        break;
      }
      const element = response.topicItemStats[i];

      let topicName = "";

      // quick hack to prevent any spoilers
      if (element.topic.isSpoiler || element.topic.isSensitive) {
        topicName = ":warning: " + discord.spoiler(`${element.topic.name}`);
      } else {
        topicName = discord.spoiler(`${element.topic.name}`);
      }
      if (element.yesSum > element.noSum) {
        replyEmbed.addFields({
          inline: true,
          name: topicName,
          value: `${element.yesSum}+ ${element.noSum}-`,
        });
        numResults++;
      }
      i++;
    }
  }

  if (numResults < 1) {
    replyEmbed.addFields({
      inline: false,
      name: "Nobody has added any votes for this film!",
      value: `oops`,
    });
  }

  await interaction.editReply({ embeds: [replyEmbed], components: [] });
}


export const film: types.SlashCommand = {
  Builder: new discord.SlashCommandBuilder()
    .setName("film")
    .setDescription("Search for a movie (updated!)")
    .addStringOption(
      new discord.SlashCommandStringOption()
        .setName("query")
        .setDescription("The name of the movie to search for")
    )
    .addStringOption(
      new discord.SlashCommandStringOption()
        .setName("filmID")
        .setDescription("The numeric ID of a known film, i.e. 960726. Will override query.")
    )
    .toJSON(),

  Handlers: {
    "film": async (interaction: discord.ChatInputCommandInteraction) => {
      await interaction.deferReply();

      let filmID = interaction.options.getString("filmID");
      if (filmID != null) {
        filmSelectID(filmID, interaction)
        return
      }

      let query = interaction.options.getString("query");
      if (query != null) {
        filmSearch(query, interaction)
      }
    },
    "filmSelectID": async (interaction: discord.StringSelectMenuInteraction) => {
      await interaction.deferUpdate();
      let filmID = interaction.values[0]

      filmSelectID(filmID, interaction)
    },
  }
};
