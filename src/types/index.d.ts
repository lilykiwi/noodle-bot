import {
  CacheType,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  StringSelectMenuInteraction,
} from "discord.js";

export type SlashCommand = {
  Builder: RESTPostAPIChatInputApplicationCommandsJSONBody;
  InputCommandHandler?: (
    interaction: ChatInputCommandInteraction
  ) => Promise<void> | undefined;
  StringSelectMenuHandler?: (
    interaction: StringSelectMenuInteraction
  ) => Promise<void> | undefined;
};

export interface DTDDSearchResponse {
  items: Array<filmItem>;
}

export interface filmItem {
  id: number;
  name: string;
  cleanName: string;
  genre: string;
  releaseYear: string;
  legacyId: number;
  legacyUserId: number;
  umId: number | null;
  legacyItemType: string;
  newsletterDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  UserId: number;
  ItemTypeId: number;
  tmdbId: number;
  imdbId: number | null;
  backgroundImage: string | null;
  posterImage: string | null;
  tmdbResult: null;
  overview: string;
  itemType: {
    id: number;
    name: string;
  };
  itemTypeId: number;
}

export interface DTDDFilmResponse {
  item: filmItem;
  topicItemStats: Array<topicItemStats>;
}

export interface topicItemStats {
  topicItemId: number;
  newslatterDate: Date | null;
  yesSum: number;
  noSum: number;
  numComments: number;
  TopicId: number;
  ItemId: number;
  RatingId: number;
  commentUserIds: string;
  voteSum: number;
  comment: string;
  isAnonymous: number;
  username: string;
  UserId: number;
  verified: number;
  itemName: string;
  itemCleanName: string;
  releaseYear: number;
  itemTypeName: string;
  itemTypeSlug: string;
  itemTypeId: number;
  isYes: number;
  hasUserComment: boolean;
  itemId: number | null;
  comments: Array<comment>;
  topic: {
    id: number;
    name: string;
    notName: string;
    keywords: string | null;
    description: string | null;
    subtitle: string | null;
    subtitleText: string | null;
    subtitleUrl: string | null;
    doesName: string;
    listName: string;
    image: string;
    ordering: number;
    isSpoiler: boolean;
    isVisible: boolean;
    isSensitive: boolean;
    smmwDescription: string;
    legacyId: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface comment {
  id: number;
  voteSum: number;
  comment: string;
  User: {
    id: number;
    displayName: string;
  };
}
