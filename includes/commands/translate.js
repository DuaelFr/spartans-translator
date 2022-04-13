const { MessageEmbed } = require('discord.js');
const config = require("../../config.json");
const { sendError, configGet, configSet } = require("../helpers");
const querystring = require("querystring");
const https = require("https");

async function reaction(reaction, user) {
  // For non-flag emojis.
  if (!reaction.emoji.name.match(/[🇦-🇿]{2}/u)) {
    return;
  }

  // Handle unsupported languages.
  if (!config.langs[reaction.emoji.name]) {
    return sendError(reaction.message, `Unsupported language: ${reaction.emoji.name}`);
  }

  // Get translation from the cache.
  const msgKey = `${reaction.message.id}:${config.langs[reaction.emoji.name]}`;
  let translation = await configGet(reaction.message.guildId, msgKey, false);
  if (translation) {
    sendTranslation(user, reaction.message, reaction.emoji.name, translation);
    return;
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

      sendTranslation(user, reaction.message, reaction.emoji.name, data.translations[0].text);
      // Save translation to the cache.
      configSet(reaction.message.guildId, msgKey, data.translations[0].text);
    });
  });
}

const sendTranslation = (user, message, language, translation) => {
  const url = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;

  const embedOriginal = new MessageEmbed()
    .setAuthor({
      name: message.author.username,
      url: url,
      iconURL: message.author.avatarURL(),
    })
    .setColor(message.author.accentColor)
    .setDescription(message.content)
    .addField(language, translation);

  user.send({ embeds: [embedOriginal] });
}

module.exports = {
  init() {},
  handle() {},
  reaction,
};
