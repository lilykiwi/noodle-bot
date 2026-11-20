# Noodle Bot

## About

This is a bot I'm working on to power my personal Discord server, written in typescript, running on bun and using discord.js. This bot aims to implement features relating to movie night, such as event scheduling, content warnings, etc, as various quality-of-life features that might be expected in a bot like this.

## Commands

### `/film [query: string]`

This command searches for films on [Does the Dog Die](https://www.doesthedogdie.com/), presenting all of the results in a dropdown. Clicking on a dropdown then refreshes the reply with a list of the top 25 categories, implying the film contains material that deserves a content warning. This is useful if a film may contain content which may be disturbing, triggering, upsetting, etc, and is used in the lead-up to movie nights (every Saturday, or more frequent if you're a nerd).

### `/watchlist add|list|remove`

The server's shared list of films to watch. `add` searches DTDD (only visible to you), `remove` autocompletes from the list.

### `/pick`

Picks a random film from the watchlist, with reroll and content warning buttons.

### `/movienight`

A private setup wizard: pick Saturday or Sunday (9pm by default) or any other day/time, whose pick it is, and a film from the watchlist or a search. Creates a Discord scheduled event (the bot needs the **Create Events** permission), posts an announcement, and removes the film from the watchlist if it was on it. Time, timezone and channel are configured in `.env` (see `example.env`).

## Quick Start

0. Set up a bot at [https://discord.com/developers/applications](https://discord.com/developers/applications) and grab the Token and AppID for later. The token is used for initialising the client, and the AppID is used for registering slash commands.
1. Register an account at [https://www.doesthedogdie.com/](https://www.doesthedogdie.com/) and grab the API Key from your profile section. This is used for fetching content warning data about films.
2. Clone this repo
    ```sh
    git clone https://github.com/lilykiwi/noodle-bot
    ```
3. Install the dependencies
    ```sh
    bun install
    ```
4. Setup the bot env file. Take the `example` string out of the included `example.env` file, and populate with tokens/ids/etc.
    ```ts
    // ./.env
    TOKEN=[bot token]
    APPID=[bot app id]
    DDTDTOKEN=[does the dog die user token]
    ```
5. Start the bot!
    ```sh
    bun start
    ```

## Development

```sh
bun test         # run the tests once
bun run dev      # run the bot, restart on save
bun run check    # typecheck + lint + test
```

Note: the DTDD API (v3.0) needs a key created under "API keys" on your profile page; older user tokens get `app_key_not_permitted`. Free tier is 30 req/min, 5,000/month, and every reply shows the required "Powered by DoesTheDogDie.com" attribution.

## Updating

- update deps: `bun update`
- `pm2` quick start: `pm2 start "bun start" --name "noodle-bot"`
