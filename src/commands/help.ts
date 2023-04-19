import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
} from "discord.js";
import { SlashCommand } from "../types";

export const help: SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Print help on how to use this bot")
    .toJSON(),

    Handlers: {
      "help": async (
        interaction: ChatInputCommandInteraction
      ) => {
        await interaction.deferReply();
        await interaction.editReply("Read the slash commands you dork!");
      },
    }
};
