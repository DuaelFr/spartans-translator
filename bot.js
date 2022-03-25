const { Client, Intents, MessageEmbed} = require('discord.js');
const logger = require('winston');
const https = require('https');
const querystring = require('querystring');
const config = require('./config.json');
const { sendError } = require('./includes/helpers');

// Configure logger settings.
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot.
const bot = new Client({
  partials: ["CHANNEL"], // Needed for DMs.
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES],
});

// Log when ready.
bot.once('ready', () => {
  logger.info(`Logged in as ${bot.user.tag}!`);

  bot.user.setActivity({
    name: `${config.prefix}help`,
    type: "LISTENING"
  });
});

// Load all message handlers.
const normalizedPath = require("path").join(__dirname, "includes/commands");
let msgHandlers = [];
require("fs").readdirSync(normalizedPath).forEach(function(file) {
  msgHandlers.push(require("./includes/commands/" + file));
});

// Init.
for (let i in msgHandlers) {
  msgHandlers[i].init();
}

// Handle messages.
bot.on('messageCreate', msg => {
  if (msg.content.substring(0, 1) === config.prefix) {
    const command = msg.content.split(' ')[0].substring(config.prefix.length);
    for (let i in msgHandlers) {
      msgHandlers[i].handle(command, msg);
    }
  }
});

// Handle reactions.
bot.on('messageReactionAdd', (reaction, user) => {
  // For non-flag emojis.
  if (!reaction.emoji.name.match(/[🇦-🇿]{2}/u)) {
    return;
  }

  // Handle unsupported languages.
  if (!config.langs[reaction.emoji.name]) {
    return sendError(reaction.message, `Unsupported language: ${reaction.emoji.name}`);
  }

  const data = querystring.stringify({
    target_lang: config.langs[reaction.emoji.name],
    text: reaction.message.content
  });

  const options = {
    hostname: process.env.DEEPL_API_DOMAIN,
    path: `/v2/translate?${data}`,
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`
    }
  }

  https.get(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', e => {
      const data = JSON.parse(body);

      const embed = new MessageEmbed()
        .setTitle(`${reaction.emoji.name} Translation ${reaction.emoji.name}`)
        .setDescription(data.translations[0].text);
      reaction.message.channel.send({ embeds: [embed], reply: { messageReference: reaction.message.id } });
    });
  });
});

bot.login(process.env.TOKEN);
