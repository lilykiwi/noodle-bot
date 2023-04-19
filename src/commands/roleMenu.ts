import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  //SlashCommandRoleOption
} from "discord.js";
import { SlashCommand } from "../types";

export const roleMenu: SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName("rolemenu")
    .setDescription("Display the role menu selector")
    //.addRoleOption(new SlashCommandRoleOption()) todo
    .toJSON(),

  Handlers: {
    rolemenu: async (interaction: ChatInputCommandInteraction<CacheType>) => {
      await interaction.deferReply();

      const roleSelectRow =
        new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder({})
            .setCustomId("roleMenuSelect")
            .setPlaceholder("Select Roles")
            .setMinValues(0)
            .setMaxValues(25)
        );

      const roleButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("customPronounRoleButton")
          .setLabel("Create a custom role")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({
        embeds: [],
        components: [roleSelectRow, roleButtonRow],
      });
    },
    roleMenuSelect: async (
      interaction: ChatInputCommandInteraction<CacheType>
      ) => {
        await interaction.reply({
          content: "todo lol",
          embeds: [],
          components: [],
          ephemeral: true,
        });
      },
    customPronounRoleButton: async (
      interaction: ButtonInteraction<CacheType>
    ) => {
      await interaction.reply({
        content: "todo lol",
        embeds: [],
        components: [],
        ephemeral: true,
      });
    },
  },
};
