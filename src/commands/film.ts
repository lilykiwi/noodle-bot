import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandStringOption,
  spoiler,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js'
import * as types from '../types'

const DDTDTOKEN: string = process.env.DDTDTOKEN!
const DDTDheaders = {
  Accept: 'application/json',
  'X-API-KEY': DDTDTOKEN,
}

interface IWarning {
  yesSum: number
  noSum: number
  topicName: string
}

async function filmSearch(
  query: string,
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction
) {
  const reply = new ContainerBuilder().setAccentColor(0x0099ff)

  const resp = await fetch(
    'https://www.doesthedogdie.com/dddsearch?q=' + encodeURI(query),
    {
      method: 'GET',
      headers: DDTDheaders,
    }
  )
  const response = <types.DTDDSearchResponse>await resp.json()

  if (response.items.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('filmSelectID')
      .setPlaceholder(`${response.items.length} results found`)

    reply
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Click one of these and then submit to fetch!')
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(selectMenu)
      )

    try {
      for (let index = 0; index < response.items.length; index++) {
        const film = response.items[index]
        let descriptionValue = ''
        let filmName = ''
        if (film.releaseYear == 'Unknown') {
          film.releaseYear = '????'
        }
        if (film.name) {
          filmName = film.name.substring(0, 19)
          // FIXME: truncate length is hardcoded here, should be calculated instead.
          if (film.name.length > 19) {
            filmName = film.name.substring(0, 16)
            filmName += '...'
          }
        }
        if (film.overview) {
          descriptionValue = film.overview.substring(0, 100)
          if (film.overview.length > 100) {
            descriptionValue = film.overview.substring(0, 97)
            descriptionValue += '...'
          }
        } else {
          descriptionValue = 'no description provided'
        }
        selectMenu.addOptions({
          label: `${filmName} (${film.releaseYear})`,
          description: `${descriptionValue}`,
          value: `${film.id}`,
        })
      }
    } catch (error) {
      console.log(error)
      await interaction.editReply(
        'Something went wrong! ping <@583325947022016523>'
      )
    }

    try {
      await interaction.editReply({
        components: [reply],
        flags: MessageFlags.IsComponentsV2,
      })
    } catch (error) {
      console.log(error)
      await interaction.editReply(
        'Something went wrong! ping <@583325947022016523>'
      )
    }
  }

  if (response.items.length == 0) {
    reply
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('### No results found!')
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('Try another search term maybe?')
      )

    await interaction.editReply({
      components: [reply],
      flags: MessageFlags.IsComponentsV2,
    })
  }
}

async function filmSelectID(
  query: string,
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction
) {
  const resp = await fetch(
    'https://www.doesthedogdie.com/media/' + encodeURI(query),
    {
      method: 'GET',
      headers: DDTDheaders,
    }
  )
  const response = <types.DTDDFilmResponse>await resp.json()

  let filmName = ''
  filmName = response.item.name.substring(0, 92)
  if (response.item.name.length > 92) {
    filmName = response.item.name.substring(0, 89)
    filmName += '...'
  }

  const reply = new ContainerBuilder().setAccentColor(0x0099ff)

  reply
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# [${filmName} (${response.item.releaseYear})](${'https://www.doesthedogdie.com/media/' + encodeURI(query)})`
      )
    )
    .addSeparatorComponents((separator) => separator)

  const warnings: Array<IWarning> = []

  if (response.topicItemStats.length > 0) {
    response.topicItemStats.forEach((element) => {
      let topicName = ''

      // quick hack to prevent any spoilers

      topicName = `${element.topic.name}`
      if (element.yesSum > element.noSum) {
        warnings.push({
          yesSum: element.yesSum,
          noSum: element.noSum,
          topicName: topicName,
        })
      }
    })

    // messy sort lol
    const sortedWarnings = warnings.sort((a, b) => {
      if (a.yesSum > b.yesSum) {
        return -1
      }
      if (a.yesSum < b.yesSum) {
        return 1
      }
      return 0
    })
    let output = ''
    sortedWarnings.forEach((element) => {
      output += `1. ${element.topicName}  \`${element.yesSum}+, ${element.noSum}-\`\n`
    })
    reply.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(spoiler(output))
    )
  }

  if (response.topicItemStats.length < 1) {
    reply.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`Nobody has added any votes for this film!`)
    )
  }

  await interaction.editReply({
    components: [reply],
    flags: MessageFlags.IsComponentsV2,
  })
}

export const film: types.SlashCommand = {
  Builder: new SlashCommandBuilder()
    .setName('film')
    .setDescription('Search for a movie (updated!)')
    .addStringOption(
      new SlashCommandStringOption()
        .setName('query')
        .setDescription('The name of the movie to search for')
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName('filmid')
        .setDescription(
          'The numeric ID of a known film, i.e. 960726. Will override query.'
        )
    )
    .toJSON(),

  Handlers: {
    film: async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply()

      const filmID = interaction.options.getString('filmid')
      if (filmID != null) {
        filmSelectID(filmID, interaction)
        return
      }

      const query = interaction.options.getString('query')
      if (query != null) {
        filmSearch(query, interaction)
        return
      }

      // if we get here, the user didn't specify a query *or* a film id.
      // we need to clear the deferred reply and complain at them

      const reply = new ContainerBuilder()
        .setAccentColor(0x0099ff)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            'No search term or film ID. You probably wanted to search or specify an ID?'
          )
        )
      await interaction.editReply({
        components: [reply],
        flags: MessageFlags.IsComponentsV2,
      })
    },
    filmSelectID: async (interaction: StringSelectMenuInteraction) => {
      await interaction.deferUpdate()
      const filmID = interaction.values[0]

      filmSelectID(filmID, interaction)
    },
  },
}
