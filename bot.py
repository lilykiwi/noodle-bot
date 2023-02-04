import discord
import httpx
from dotenv import dotenv_values

config = dotenv_values(".env")
# config.dttdKey - Does the Dog Die key
# config.botKey - Discord bot key

# example .env file:
#dtddKey=[key]
#botKey=[key]

headers = {
  "Accept": "application/json",
  "X-API-KEY": config["dtddKey"]
}

def startswith(source, prefix):
  return source[:len(prefix)] == prefix

def shaveStart(source, prefix):
  return source[len(prefix):]

class MovieBot(discord.Client):
  async def on_ready(self):
    guilds = []
    for guild in self.guilds:
      guilds.append(guild)
    print(f'Logged in. Currently in {len(guilds)} guilds.')
    if (len(guilds) > 2):
      for guild in guilds:
        print("- " + guild)

  async def on_message(self, message):

    if (message.content.startswith("$film")):
      channel = message.channel
      query = shaveStart(message.content, "$film")
      
      if len(query) < 2:
        replyEmbed = discord.Embed(
            type="rich",
            title="How to Use",
            description="Type the command `$film [query]` to search for a film and get it's ID\nType the command `$film [ID (number)]` to show warnings for a given film after searching for it"
          )
        await channel.send(embed=replyEmbed)
        return

      query = shaveStart(query, " ")

      if query.isdigit():
        async with httpx.AsyncClient() as client:
          response = httpx.get(f'https://www.doesthedogdie.com/media/{query}', headers = headers)
          data = response.json()
          replyEmbed = discord.Embed(
            type="rich",
            title=f'Search Results for {data["item"]["name"]}',
            url=f'https://www.doesthedogdie.com/media/{query}'
          )
          output = []
          for topic in data["topicItemStats"]:
            if topic["yesSum"] > topic["noSum"]:
              replyEmbed.add_field(
                name=topic["doesName"],
                value=f'{topic["yesSum"]}+, {topic["noSum"]}-',
              )
          await channel.send(embed=replyEmbed)
      else:
        async with httpx.AsyncClient() as client:
          response = httpx.get(f'https://www.doesthedogdie.com/dddsearch?q={query}', headers = headers)
          data = response.json()
          searchResults = []
          for film in data["items"]:
            searchResults.append({"id": film["id"], "name": film["name"], "year": film["releaseYear"], "rating": film["numRatings"]})
          replyEmbed = discord.Embed(
            type="rich",
            title=f'Search Results',
            description="Reply with any result in bold for details on that movie:"
          )
          for result in searchResults:
            if result["rating"] > 5:
              replyEmbed.add_field(name=f'$film {result["id"]}', value=f'{result["name"]}, {result["year"]}, {result["rating"]} ratings', inline=False)
          await channel.send(embed=replyEmbed)

intents = discord.Intents.default()
intents.message_content = True

client = MovieBot(intents=intents)
client.run(config["botKey"])
