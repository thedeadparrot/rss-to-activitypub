const config = require('./config.json');
const { DOMAIN, PRIVKEY_PATH, CERT_PATH, PORT_HTTP, PORT_HTTPS } = config;
const Database = require('better-sqlite3');
const db = new Database('bot-node.db'),
      Parser = require('rss-parser'),
      request = require('request'),
      crypto = require('crypto'),
      parser = new Parser({timeout: 2000});


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
      console.log('Response header: ', response.headers);
    });
  }
}

function updateMessage(name, domain) {
  const guidCreate = crypto.randomBytes(16).toString('hex');

  let result = db.prepare('select actor from accounts where name = ?').get(uri);
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


var args = process.argv.slice(2);
console.log(args);

let name = args[0];
let domain = DOMAIN;
let uri = name + '@' + domain;
let result = db.prepare('select actor from accounts where name = ?').get(uri);
if (result === undefined) {
  console.log(`No record found for ${name}.`);
}
else {
  sendUpdateMessage(name, domain, null, null);
}