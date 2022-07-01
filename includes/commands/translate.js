const { MessageEmbed } = require('discord.js');
const config = require("../../config.json");
const { sendError, configGet, configSet, dectectLanguage } = require("../helpers");

async function reaction(reaction, user) {
  // For non-flag emojis.
  if (!reaction.emoji.name.match(/[🇦-🇿]{2}/u)) {
    return;
  }

  // Handle unsupported languages.
  if (!config.langs[reaction.emoji.name]) {
    return sendError(user, `Unsupported language: ${reaction.emoji.name}`);
  }

  // Get translation from the cache.
  const msgKey = `${reaction.message.id}:${config.langs[reaction.emoji.name]}`;
  const msgTime = reaction.message.editedTimestamp || reaction.message.createdTimestamp;
  let translation = await configGet(reaction.message.guildId, msgKey, false);
  if (translation) {
    if (translation.timestamp === msgTime) {
      sendTranslation(user, reaction.message, reaction.emoji.name, translation.content);
      return;
    }
  }

  const sourceLang = await dectectLanguage(reaction.message.content);
  const destinationLang = config.langs[reaction.emoji.name];

  let sourceTranslatorName = 'deepl';
  let destinationTranslatorName = 'deepl';
  for (let translatorName in [].reverse(config.translators)) {
    if (config.translators[translatorName].supportedLanguages.includes(sourceLang)) {
      sourceTranslatorName = translatorName;
    }
    if (config.translators[translatorName].supportedLanguages.includes(destinationLang)) {
      destinationTranslatorName = translatorName;
    }
  }

  const sourceTranslator = require('../translators/' + sourceTranslatorName);
  const destinationTranslator = require('../translators/' + destinationTranslatorName);
  let sourceString = reaction.message.content;

  // Use an english translation as intermediate.
  if (sourceTranslatorName !== destinationTranslatorName) {
    sourceTranslator.translate(sourceString, sourceLang, 'en')
      .then((intermediate) => {
        destinationTranslator.translate(intermediate, 'en', destinationLang)
          .then((translation) => {
            sendTranslation(user, reaction.message, reaction.emoji.name, translation);
            // Save translation to the cache.
            configSet(reaction.message.guildId, msgKey, {
              content: translation,
              timestamp: msgTime,
            });
          });
      });
  }
  // Direct translation.
  else {
    destinationTranslator.translate(sourceString, sourceLang, destinationLang)
      .then((translation) => {
        sendTranslation(user, reaction.message, reaction.emoji.name, translation);
        // Save translation to the cache.
        configSet(reaction.message.guildId, msgKey, {
          content: translation,
          timestamp: msgTime,
        });
      });
  }
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
