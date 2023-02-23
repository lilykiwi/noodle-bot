import { help } from "./help";
import { film } from "./film";
import { roleMenu } from "./roleMenu";
import { SlashCommand } from "../types";

export const commandList: Array<SlashCommand> = [help, film, roleMenu];
