const { MessageEmbed } = require('discord.js');
const { readFile } = require('fs').promises;

function handle(command, msg) {
  if (command !== 'help') {
    return;
  }

  readFile('./assets/help.md', {encoding: 'utf8'})
    .then((data) => {
      const embed = new MessageEmbed()
        .setTitle('Global help')
        .setDescription(data);
      msg.author.send({ embeds: [embed] });
    });
}

module.exports = {
  init() {},
  handle,
};
