const querystring = require("querystring");
const https = require("https");

async function translate(content, sourceLang, destinationLang) {
  const postData = querystring.stringify({
    source: sourceLang,
    target: destinationLang,
    text: content
  });

  const options = {
    hostname: 'openapi.naver.com',
    port: 443,
    path: `/v1/papago/n2mt`,
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
        resolve(data.message.result.translatedText);
      });
    });
    req.write(postData);
    req.end();
  });
}

module.exports = {
  translate,
};
