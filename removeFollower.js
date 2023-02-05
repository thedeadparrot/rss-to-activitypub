// Maintenance only
// Usage: node removeFollower.js alice "https://jabberwocky.moe/users/alice"

const config = require('/config/config.json');
const { DOMAIN, PRIVKEY_PATH, CERT_PATH, PORT_HTTP, PORT_HTTPS } = config;
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH),
      Parser = require('rss-parser'),
      parseFavicon = require('parse-favicon').parseFavicon,
      request = require('request'),
      crypto = require('crypto'),
      parser = new Parser({timeout: 2000});


var args = process.argv.slice(2);
console.log(args);

let name = args[0];
let followerToRemove = args[1];
let domain = DOMAIN;
let uri = name + '@' + domain;
let result = db.prepare('select actor from accounts where name = ?').get(uri);
if (result === undefined) {
  console.log(`No record found for ${name}.`);
}
else {
    let result = db.prepare('select followers from accounts where name = ?').get(`${name}@${domain}`);
    let followers = result.followers;
    if (followers) {
        followers = JSON.parse(followers);
        console.log(followers);
        
        const index = followers.indexOf(followerToRemove);
        if (index > -1) {
            followers.splice(index, 1);
        }
        console.log(followers); 

        followers = [...new Set(followers)];
    }
    else {
        console.log(`No followers for ${name}@${domain}`);
    }
    let followersText = JSON.stringify(followers);
    console.log('New followersText', followersText);
    // update into DB
    db.prepare('update accounts set followers = ? where name = ?').run(followersText, `${name}@${domain}`);
}
