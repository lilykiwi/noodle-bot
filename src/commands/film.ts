import * as discord from "discord.js";
import * as types from "../types";
import * as fetch from "node-fetch";

let DDTDTOKEN: string = process.env.DDTDTOKEN!;
let DDTDheaders = {
  Accept: "application/json",
  "X-API-KEY": DDTDTOKEN,
};

export const film: types.SlashCommand = {
  Builder: new discord.SlashCommandBuilder()
    .setName("film")
    .setDescription("Search for a movie")
    .addStringOption(
      new discord.SlashCommandStringOption()
        .setName("query")
        .setDescription("The name of the movie to search for")
        .setRequired(true)
    )
    .toJSON(),

  Handlers: {
    "film": async (
      interaction: discord.ChatInputCommandInteraction
    ) => {
      await interaction.deferReply();
      let query = interaction.options.getString("query");

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
    },

    "filmSelectID": async (interaction: discord.StringSelectMenuInteraction) => {
      // defer so discord is happy
      await interaction.deferUpdate();

      if (interaction.values[0]) {
        // search DDTD for the specific movie, as we have an ID now.
        let query = interaction.values[0];
        let resp = await fetch.default("https://www.doesthedogdie.com/media/" + query, {
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
          .setURL("https://www.doesthedogdie.com/media/" + query);

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
      } else {
        // we shouldn't get here but just in case
        console.log("error: interaction.customId is null or something?");

        let replyEmbed = new discord.EmbedBuilder()
          .setColor("#96152c")
          .setTitle(`something broke lol`)
          .addFields({
            inline: true,
            name: "something went wrong?",
            value: "talk to <@583325947022016523> lol",
          });
        await interaction.editReply({ embeds: [replyEmbed], components: [] });
      }
    },
  }
};
