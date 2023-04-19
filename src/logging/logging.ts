import chalk from "chalk";
import {
  BaseInteraction,
  CacheType,
  CommandInteractionOption,
  TextChannel,
} from "discord.js";

export async function generateLogString(
  interaction: BaseInteraction<CacheType>
) {
  let channelName: string | undefined = "",
    commandString: string | undefined = "unknown (bug?)",
    interactionType: string | undefined = "",
    args: string | string[] | undefined = "",
    user: string = `@${interaction.user.username}#${interaction.user.discriminator}`,
    date: Date = new Date(),
    rawOptionsData: ReadonlyArray<CommandInteractionOption>;

  // get current channel/guild context and name
  // -> Direct Message or Guild/#channel

  if (interaction.channel?.isTextBased && interaction.guild) {
    const channel = <TextChannel>await interaction.channel.fetch();
    channelName = `${interaction.guild.name}/#${channel.name}`;
  }

  if (interaction.channel?.isDMBased && !interaction.guild) {
    channelName = `Direct Message`;
  }

  // subclass specific stuff

  if (interaction.isAutocomplete()) {
    // do not log for this; this happens whenever someone types and pauses
    interactionType = "AutocompleteInteraction";
    return;
  }

  /* unimplemented atm, todo
  if (interaction.isContextMenuCommand()) {
    interactionType = "ContextMenuCommandInteraction";
  }

  if (interaction.isUserContextMenuCommand()) {
    interactionType = "UserContextMenuCommandInteraction";
  }

  if (interaction.isMessageContextMenuCommand()) {
    interactionType = "MessageContextMenuCommandInteraction";
  }

  if (interaction.isModalSubmit()) {
    interactionType = "ModalSubmitInteraction";
  }

  if (interaction.isMessageComponent()) {
    interactionType = "MessageComponentInteraction";
  }
  */

  if (interaction.isButton()) {
    interactionType = "ButtonInteraction";
    args = interaction.customId;
    commandString = interaction.message.content;
  }

  if (interaction.isCommand()) {
    interactionType = "CommandInteraction";
    commandString = "/" + interaction.commandName;
  }

  if (interaction.isChatInputCommand()) {
    interactionType = "ChatInputCommandInteraction";
    commandString = "/" + interaction.commandName;
    rawOptionsData = interaction.options.data;
    rawOptionsData.forEach((element) => {
      args = args + `${element.name}: ${element.value} `;
    });
  }

  if (interaction.isMentionableSelectMenu()) {
    interactionType = "MentionableSelectMenuInteraction";
    commandString = interaction.customId;
    interaction.members.forEach((element) => {
      args += `${element.user?.username} `;
    });
  }

  if (interaction.isRoleSelectMenu()) {
    interactionType = "RoleSelectMenuInteraction";
    commandString = interaction.customId;
    interaction.roles.forEach((element) => {
      args += `${element.name} `;
    });
  }

  if (interaction.isChannelSelectMenu()) {
    interactionType = "ChannelSelectMenuInteraction";
    commandString = interaction.customId;
    interaction.channels.forEach((element) => {
      args += `${element} `;
    });
  }

  if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
    interactionType = "StringSelectMenuInteraction";
    commandString = interaction.customId;
    args = interaction.values;
  }

  // formatting
  interactionType = chalk.red(interactionType);
  user = chalk.green(user);
  args = chalk.yellow(args);
  channelName = chalk.bold.blue(channelName);
  // i hate js
  let dateString = chalk.cyan(
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`
  );
  commandString = chalk.underline(commandString);

  console.log(`${dateString} ${interactionType}: ${commandString} ${args}`);
  console.log(`      -> ${user} in ${channelName}`);
}
