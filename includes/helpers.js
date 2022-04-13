const { MessageEmbed } = require('discord.js');
const Redis = require("ioredis");
const serialize = require('serialize-javascript');
const { promisify } = require("util");
const { URL } = require("url");
const querystring = require("querystring");
const https = require("https");

// Configure redis database.
const redis_uri = new URL(process.env.REDIS_TLS_URL);
const redisOptions = process.env.REDIS_TLS_URL.includes("rediss://")
  ? {
    port: Number(redis_uri.port),
    host: redis_uri.hostname,
    password: redis_uri.password,
    db: 0,
    tls: {
      rejectUnauthorized: false,
    },
  }
  : process.env.REDIS_TLS_URL;
const redisClient = new Redis(redisOptions);
redisClient.on("error", function(error) {
  throw "Cannot connect to the database. " + error;
});

// Base redis methods.
const redisGetAsync = promisify(redisClient.get).bind(redisClient);
const redisSetAsync = promisify(redisClient.set).bind(redisClient);

/**
 * Send an error message to the client.
 *
 * @param msg
 * @param errorMessage
 */
const sendError = (channel, errorMessage) => {
  const embed = new MessageEmbed()
    .setTitle('Erreur')
    .setColor(0xff0000)
    .setDescription(errorMessage);
  channel.send({embeds: [embed]});
}

/**
 * Get configuration values.
 *
 * @param guild
 * @param key
 * @param defaultValue
 * @returns {PromiseLike<any> | Promise<any>}
 */
const configGet = (guild, key, defaultValue = undefined) => {
  return redisGetAsync(`sptr:${guild}:${key}`)
    .then((serialized) => {
      return eval('(' + serialized + ')');
    })
    .then((data) => {
      if (!data) {
        return defaultValue;
      }
      return data;
    })
    .catch((error) => {
      console.log(error);
      return defaultValue;
    });
}

/**
 * Set configuration values.
 *
 * @param guild
 * @param key
 * @param value
 * @returns {*}
 */
const configSet = (guild, key, value) => {
  return redisSetAsync(`sptr:${guild}:${key}`, serialize(value))
    .catch((error) => {
      console.log(error);
    });
}

/**
 * Detect the string language.
 *
 * @param content
 * @returns {Promise<unknown>}
 */
async function dectectLanguage(content) {
  const postData = querystring.stringify({
    query: content
  });

  const options = {
    hostname: 'openapi.naver.com',
    port: 443,
    path: `/v1/papago/detectLangs`,
    method: 'POST',
    headers: {
      'X-Naver-Client-Id': process.env.PAPAGO_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.PAPAGO_CLIENT_SECRET,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': postData.length
    }
  }

  return new Promise(resolve => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', e => {
        const data = JSON.parse(body);
        resolve(data.langCode);
      });
    });
    req.write(postData);
    req.end();
  });

}

module.exports = { sendError, configGet, configSet, dectectLanguage };
