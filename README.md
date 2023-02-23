# Noodle Bot

## About

This is a bot I'm working on to power my personal Discord server, written in typescript and using discord.js. This bot aims to implement features relating to movie night, such as event scheduling, content warnings, etc, as well as role-changes and various quality-of-life features that might be expected in a bot like this.

## Commands

### `/help`

I don't honestly know why I haven't removed this command yet. Oh well!

### `/film [query: string]`

This command searches for films on [Does the Dog Die](https://www.doesthedogdie.com/), presenting all of the results in a dropdown. Clicking on a dropdown then refreshes the reply with a list of the top 25 categories, implying the film contains material that deserves a content warning. This is useful if a film may contain content which may be disturbing, triggering, upsetting, etc, and is used in the lead-up to movie nights (every Saturday, or more frequent if you're a nerd).

## Quick Start

0. Set up a bot at [https://discord.com/developers/applications](https://discord.com/developers/applications) and grab the Token and AppID for later. The token is used for initialising the client, and the AppID is used for registering slash commands.
1. Register an account at [https://www.doesthedogdie.com/](https://www.doesthedogdie.com/) and grab the API Key from your profile section. This is used for fetching content warning data about films.
2. Clone this repo
    ```bash
    $ git clone https://github.com/lilykiwi/movie-bot
    ```
3. Install the dependencies
    ```bash
    $ yarn install
    ```
4. Setup the bot
    ```ts
    // ./.env
    // see the 'Environment Variables' section for more info
    TOKEN=[bot token]
    APPID=[bot app id]
    DDTDTOKEN=[does the dog die user token]
    ```
5. Start the bot!
    ```bash
    $ yarn tsc 
    $ node build/index.js
    ```
