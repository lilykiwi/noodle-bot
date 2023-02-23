import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  //SlashCommandRoleOption
} from "discord.js";
import { SlashCommand } from "../types";

export const roleMenu: SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName("rolemenu")
    .setDescription("Display the role menu selector")
    //.addRoleOption(new SlashCommandRoleOption()) todo
    .toJSON(),

  InputCommandHandler: async (
    interaction: ChatInputCommandInteraction
  ) => {
    await interaction.deferReply();

    const roleSelectRow =
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder({})
          .setCustomId("roleselect")
          .setPlaceholder("Select Roles")
          .setMinValues(0)
          .setMaxValues(25)
      );

    const roleButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("customPronounRole")
        .setLabel("Create a custom role")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
      embeds: [],
      components: [roleSelectRow, roleButtonRow],
    });
  },
};
