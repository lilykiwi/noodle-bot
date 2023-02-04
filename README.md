# Movie Bot

This is my discord bot for movie night, currently fetches trigger/content warnings for a piece of media.

## Setup

This bot needs two keys to work
- config.dttdKey - Does the Dog Die key
- config.botKey - Discord bot key

example .env file:

```env
dtddKey=[key]
botKey=[key]
```

## Usage

typing `$film` in a channel the bot can access will give a help readout. `$film [string]` will search for a film with a given name, whereas `$film [int]` will fetch the tags of a given film in the DtDD database. 

example:

```
$film the french dispatch

Search Results
Reply with any result in bold for details on that movie:
$film 40791
The French Dispatch, 2020, 1092 ratings

$film 40791

Search Results for The French Dispatch
Is there a dead animal
15+, 3-
Does someone abuse alcohol
15+, 0-
Is there addiction
9+, 2-
... etc
```