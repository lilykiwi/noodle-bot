import * as film from './film.js'
//import * as TextDisplayTest from './testDisplay.js'
import type * as types from '../types/index.js'

export const commandList: Array<types.SlashCommand> = [
  film.film,
  //TextDisplayTest.TextDisplayTest,
]
