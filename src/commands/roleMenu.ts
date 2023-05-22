import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  CacheType,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  StringSelectMenuBuilder,
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
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder({})
            .setCustomId("roleMenuSelect")
            .setPlaceholder("Select Roles")
            .setMinValues(0)
            .setMaxValues(6)
            .addOptions([
              {
                label: "he/him",
                value: "he/him",
              },
              {
                label: "they/them",
                value: "they/them",
              },
              {
                label: "she/her",
                value: "she/her",
              },
              {
                label: "fae/faer",
                value: "fae/faer",
              },
              {
                label: "it/its",
                value: "it/its",
              },
              {
                label: "it/its",
                value: "it/its",
              },
            ])
        );

      const roleButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("customPronounRoleButton")
          .setLabel("Create a custom role")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("removePronounRolesButton")
          .setLabel("Remove all pronoun roles")
          .setStyle(ButtonStyle.Danger)
      );
      
      // fetch the roles available on the server
      const roles = await interaction.guild?.roles.fetch();
      if (!roles) {
        await interaction.editReply({
          content: "There was an error fetching the roles",
          embeds: [],
          components: [],
        });
        return;
      }

      // add the roles to the select menu
      

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
      // show the user a prompt to create a role
      await interaction.reply({
				content: "todo lol",
				embeds: [],
				components: [],
				ephemeral: true,
			});
    },

    removePronounRolesButton: async (
      interaction: ButtonInteraction<CacheType>
    ) => {
      // get the user's roles
      const member = await interaction.guild?.members.fetch(interaction.user.id);
      if (!member) {
        await interaction.reply({
          content: "There was an error fetching your roles",
          embeds: [],
          components: [],
          ephemeral: true,
        });
        return;
      }

      // filter out the roles that are pronoun roles
      const pronounRoles = member.roles.cache.filter(role => role.name.includes("/"));

      // remove the roles
      await member.roles.remove(pronounRoles);

      await interaction.reply({
        content: "Removed your pronoun roles",
        embeds: [],
        components: [],
        ephemeral: true,
      });
    },

  },
};
