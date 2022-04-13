const querystring = require("querystring");
const https = require("https");

async function translate(content, sourceLang, destinationLang) {
  const data = querystring.stringify({
    source_lang: sourceLang.toUpperCase(),
    target_lang: destinationLang.toUpperCase(),
    text: content
  });

  const options = {
    hostname: process.env.DEEPL_API_DOMAIN,
    path: `/v2/translate?${data}`,
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`
    }
  }

  return new Promise(resolve => {
    https.get(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', e => {
        const data = JSON.parse(body);
        resolve(data.translations[0].text);
      });
    });
  });
}

module.exports = {
  translate,
};
