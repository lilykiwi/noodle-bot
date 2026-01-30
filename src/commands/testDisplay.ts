import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ButtonStyle,
  ContainerBuilder,
  UserSelectMenuBuilder,
} from 'discord.js'
import * as types from '../types'

export const TextDisplayTest: types.SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName('textdisplaytest')
    .setDescription('new text display component? neat??')
    .toJSON(),

  Handlers: {
    textdisplaytest: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply()

      // if we get here, the user didn't specify a query *or* a film id.
      // we need to clear the deferred reply and complain at them

      const reply = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            'This text is inside a Text Display component! You can use **any __markdown__** available inside this component too.'
          )
        )
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(
            new UserSelectMenuBuilder()
              .setCustomId('exampleSelect')
              .setPlaceholder('Select users')
          )
        )
        .addSeparatorComponents((separator) => separator)
        .addSectionComponents((section) =>
          section
            .addTextDisplayComponents(
              (textDisplay) =>
                textDisplay.setContent(
                  'This text is inside a Text Display component! You can use **any __markdown__** available inside this component too.'
                ),
              (textDisplay) =>
                textDisplay.setContent(
                  'And you can place one button or one thumbnail component next to it!'
                )
            )
            .setButtonAccessory((button) =>
              button
                .setCustomId('exampleButton')
                .setLabel('Button inside a Section')
                .setStyle(ButtonStyle.Primary)
            )
        )

      await interaction.editReply({
        components: [reply],
        flags: MessageFlags.IsComponentsV2,
      })
    },
  },
}
