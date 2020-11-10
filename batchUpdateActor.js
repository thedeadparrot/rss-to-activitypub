const config = require('./config.json');
const { DOMAIN, PRIVKEY_PATH, CERT_PATH, PORT_HTTP, PORT_HTTPS } = config;
const Database = require('better-sqlite3');
const db = new Database('bot-node.db'),
      Parser = require('rss-parser'),
      parseFavicon = require('parse-favicon').parseFavicon,
      request = require('request'),
      crypto = require('crypto'),
      parser = new Parser({timeout: 2000});

const Jackd = require('jackd');
const beanstalkd = new Jackd();

beanstalkd.connect();

async function foo() {
  while (true) {
    try {
      const { id, payload } = await beanstalkd.reserve()
      console.log(payload)
      /* ... process job here ... */
      await beanstalkd.delete(id)
      await doFeed(payload)
    } catch (err) {
      // Log error somehow
      console.error(err)
    }
  }
}

foo();

function doFeed(feedUrl) {
return new Promise((resolve, reject) => {
  // fetch new RSS for each feed
  parser.parseURL(feedUrl, function(err, feedData) {
    if (err) {
      reject('error fetching ' + feedUrl + '; ' + err);
    }
    else {
      let imageUrl = null;
      if (feedData.image && feedData.image.url) {
        imageUrl = feedData.image.url;
      }
      // otherwise parse the HTML for the favicon
      else {
        let favUrl = new URL(feedUrl);
        request(favUrl.origin, (err, resp, body) => {
          parseFavicon(body, {baseURI: favUrl.origin}).then(result => {
            if (result && result.length) {
              imageUrl = result[0].url;
            }
            else {
              imageUrl = null;
            }
          });
        });
      }

      let feed = db.prepare('select * from feeds where feed = ?').get(feedUrl);
      let acct = feed.username;
      let domain = DOMAIN;

      db.prepare("UPDATE accounts SET actor = json_insert(actor, '$.icon', json_object('type', 'Image', 'mediaType', 'image/jpeg', 'url', ?)) where name = ?").run(imageUrl, `${acct}@${domain}`);

      sendUpdateMessage(acct, domain, null, null);
      return resolve('done with ' + feedUrl);
    }
  });
}).catch((e) => console.log(e));
}

function signAndSend(message, name, domain, req, res, targetDomain, inbox) {
  // get the private key
  console.log('sending to ', name, targetDomain, inbox);
  let inboxFragment = inbox.replace('https://'+targetDomain,'');
  let result = db.prepare('select privkey from accounts where name = ?').get(`${name}@${domain}`);
  //console.log('got key', result === undefined, `${name}@${domain}`);
  if (result === undefined) {
    console.log(`No record found for ${name}.`);
  }
  else {
    // digest header
    const digest = crypto.createHash('sha256').update(JSON.stringify(message)).digest('base64');
    // console.log('Digest: ', digest);

    let privkey = result.privkey;
    const signer = crypto.createSign('sha256');
    let d = new Date();
    let stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digest}`;
    signer.update(stringToSign);
    signer.end();
    const signature = signer.sign(privkey);
    const signature_b64 = signature.toString('base64');
    const algorithm = 'rsa-sha256';
    let header = `keyId="https://${domain}/u/${name}",algorithm="${algorithm}",headers="(request-target) host date digest",signature="${signature_b64}"`;
    //console.log('signature:',header);
    request({
      url: inbox,
      headers: {
        'Host': targetDomain,
        'Date': d.toUTCString(),
        'Signature': header,
        'Digest': `SHA-256=${digest}`,
        'Content-Type': 'application/activity+json',
        'Accept': 'application/activity+json'
      },
      method: 'POST',
      json: true,
      body: message
    }, function (error, response, body){
      console.log('Response: ', response.body);
      console.log('statusCode:', response.statusCode);
      //console.log('Response header: ', response.headers);
    });
  }
}

function updateMessage(name, domain) {
  const guidCreate = crypto.randomBytes(16).toString('hex');
  
  let handle = name + '@' + domain;
  let result = db.prepare('select actor from accounts where name = ?').get(handle);
  let actor = JSON.parse(result.actor);
  if (actor.followers === undefined) {
    actor.followers = `https://${domain}/u/${username}/followers`;
  }

  delete actor['@context'];

  let out = {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    'id': `https://${domain}/m/${guidCreate}`,
    'type': 'Update',
    'actor': `https://${domain}/u/${name}`,
    'object': actor
  };

  return out;
}

function sendUpdateMessage(name, domain, req, res) {
  // console.log(`${name}@${domain}`);
  let result = db.prepare('select followers from accounts where name = ?').get(`${name}@${domain}`);
  //console.log(result);
  let followers = JSON.parse(result.followers);
  // console.log(followers);

  if (!followers) {
    followers = [];
  }
  for (let follower of followers) {
    let inbox = follower+'/inbox';
    let myURL = new URL(follower);
    let targetDomain = myURL.hostname;
    let message = updateMessage(name, domain);
    console.log(message);
    signAndSend(message, name, domain, req, res, targetDomain, inbox);
  }
}
