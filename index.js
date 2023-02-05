const config = require('/config/config.json');
const { DB_PATH, DOMAIN, PRIVKEY_PATH, CERT_PATH, PORT_HTTP, PORT_HTTPS, OAUTH } = config;
const express = require('express');
const app = express();
const Database = require('better-sqlite3');
const db = new Database(DB_PATH);
const routes = require('./routes'),
      bodyParser = require('body-parser'),
      cors = require('cors'),
      http = require('http');

// if there is no `accounts` table in the DB, create an empty table
db.prepare('CREATE TABLE IF NOT EXISTS accounts (name TEXT PRIMARY KEY, privkey TEXT, pubkey TEXT, webfinger TEXT, actor TEXT, apikey TEXT, followers TEXT, messages TEXT)').run();
// if there is no `feeds` table in the DB, create an empty table
db.prepare('CREATE TABLE IF NOT EXISTS feeds (feed TEXT PRIMARY KEY, username TEXT, content TEXT)').run();
// if there is no `messages` table in the DB, create an empty table
db.prepare('CREATE TABLE IF NOT EXISTS messages (guid TEXT PRIMARY KEY, message TEXT)').run();

db.prepare(`CREATE TABLE IF NOT EXISTS feedhistory (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	t TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	feed	TEXT,
	username	TEXT,
	content	TEXT
)`).run();

app.set('db', db);
app.set('domain', DOMAIN);
app.set('port', process.env.PORT);
app.set('views', './views');
app.set('view engine', 'pug');
app.use(bodyParser.json({type: 'application/activity+json'})); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.get('/', (req, res) => res.render('home', { OAUTH }));

// admin page
app.options('/api', cors());
app.use('/api', cors(), routes.api);
app.use('/admin', express.static('public/admin'));
app.use('/convert', express.static('public/convert'));
app.use('/.well-known/webfinger', cors(), routes.webfinger);
app.use('/u', cors(), routes.user);
app.use('/m', cors(), routes.message);
app.use('/api/inbox', cors(), routes.inbox);
app.use(express.static('public'));

http.createServer(app).listen(app.get('port'), () => {
  console.log('Express server listening on port ' + app.get('port'));
});
