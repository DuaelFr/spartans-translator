const { MessageEmbed } = require('discord.js');
const { sendError } = require('../helpers');
const https = require('https');

function handle(command, msg) {
  if (command !== 'usage') {
    return;
  }

  const options = {
    hostname: process.env.DEEPL_API_DOMAIN,
    path: '/v2/usage',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`
    }
  }

  https.get(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', e => {
      const data = JSON.parse(body);

      const count = data.character_count;
      const limit = data.character_limit;
      const percent = count*100/limit;

      const formatter = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

      const embed = new MessageEmbed()
        .setTitle('Usage')
        .setDescription(`Used: ${formatter.format(count)} / ${formatter.format(limit)} characters (${formatter.format(percent)}%)`)
        .setFooter({text: 'This counter resets each month on the 17th.'});
      msg.channel.send({ embeds: [embed] });
    });
  }).on('error', error => {
    sendError(msg.channel, error);
  });
}

module.exports = {
  init() {},
  handle,
};
