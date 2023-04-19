import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  EmbedBuilder,
  SlashCommandStringOption,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  spoiler,
} from "discord.js";
import { SlashCommand, DTDDSearchResponse, DTDDFilmResponse } from "../types";
import fetch from 'unfetch'

let DDTDTOKEN: string = process.env.DDTDTOKEN!;
let DDTDheaders = {
  Accept: "application/json",
  "X-API-KEY": DDTDTOKEN,
};

export const film: SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName("film")
    .setDescription("Search for a movie")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("query")
        .setDescription("The name of the movie to search for")
        .setRequired(true)
    )
    .toJSON(),

    Handlers: {
      "film": async (
        interaction: ChatInputCommandInteraction
      ) => {
        await interaction.deferReply();
        let query = interaction.options.getString("query");
    
        let replyEmbed = new EmbedBuilder()
          .setColor("#96152c")
          .setTitle("Search Results");
    
        let resp = await fetch(
          "https://www.doesthedogdie.com/dddsearch?q=" + query,
          {
            method: "GET",
            headers: DDTDheaders,
          }
        );
        let response = <DTDDSearchResponse>await resp.json();
    
        if (response.items.length > 0) {
          const row = new ActionRowBuilder<ButtonBuilder>();
          const selectMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>();
    
          const selectMenu: StringSelectMenuBuilder = new StringSelectMenuBuilder()
            .setCustomId("filmSelectID")
            .setPlaceholder(`${response.items.length} results found`);
    
          try {
            for (let index = 0; index < response.items.length; index++) {
              const film = response.items[index];
              let descriptionValue = "";
              let filmName = "";
              if (film.name) {
                filmName = film.name.substring(0, 92);
                if (film.name.length > 92) {
                  filmName = film.name.substring(0, 89);
                  filmName += "...";
                }
              }
              if (film.overview) {
                descriptionValue = film.overview.substring(0, 97);
                if (film.overview.length > 97) {
                  descriptionValue = film.overview.substring(0, 94);
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
              "This operation failed! ping <@583325947022016523>"
            );
          }
    
          try {
            selectMenuRow.addComponents(selectMenu);
            await interaction.editReply({ components: [selectMenuRow] });
          } catch (error) {
            console.log(error);
            await interaction.editReply(
              "This operation failed! ping <@583325947022016523>"
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
    
      "filmSelectID": async (interaction: StringSelectMenuInteraction) => {
        // defer so discord is happy
        await interaction.deferUpdate();
    
        if (interaction.values[0]) {
          // search DDTD for the specific movie, as we have an ID now.
          let query = interaction.values[0];
          let resp = await fetch("https://www.doesthedogdie.com/media/" + query, {
            method: "GET",
            cache: "no-cache",
            headers: DDTDheaders,
          });
          let response = <DTDDFilmResponse>await resp.json();
    
          let filmName = "";
          filmName = response.item.name.substring(0, 92);
          if (response.item.name.length > 92) {
            filmName = response.item.name.substring(0, 89);
            filmName += "...";
          }
    
          let replyEmbed = new EmbedBuilder()
            .setColor("#96152c")
            .setTitle(`${filmName} (${response.item.releaseYear})`)
            .setURL("https://www.doesthedogdie.com/media/" + query);
    
          let numResults = 0;
    
          if (response.topicItemStats.length > 0) {
            for (
              let index = 0;
              index < Math.min(response.topicItemStats.length, 25);
              index++
            ) {
              const element = response.topicItemStats[index];
    
              let topicName = "";
    
              if (element.topic.isSpoiler || element.topic.isSensitive) {
                topicName = spoiler(`${element.topic.name}`);
              } else {
                topicName = `${element.topic.name}`;
              }
              if (element.yesSum > element.noSum) {
                replyEmbed.addFields({
                  inline: true,
                  name: topicName,
                  value: `${element.yesSum}+ ${element.noSum}-`,
                });
                numResults++;
              }
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
    
          let replyEmbed = new EmbedBuilder()
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
