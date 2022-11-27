# RSS to ActivityPub Converter

This is a server that lets users convert any RSS feed to an ActivityPub actor that can be followed by users on ActivityPub-compliant social networks like Mastodon.

This is forked from [umonaca/rss-to-activitypub](https://github.com/umonaca/rss-to-activitypub) which is in turn forked from [dariusk/rss-to-activitypub](https://github.com/dariusk/rss-to-activitypub).

## Requirements

You need `beanstalkd` running. This is a simple and fast queueing system we use to manage polling RSS feeds. [Here are installation instructions](https://beanstalkd.github.io/download.html). On a production server you'll want to [install it as a background process](https://github.com/beanstalkd/beanstalkd/tree/master/adm).

## Deployment

You can run this via Docker:

```
cd rss-to-activitypub/
docker build . -t rss-to-activitypub
docker run -p 3000:3000 -v $(pwd):/db rss-to-activitypub
```

## Sending out updates to followers

There is also a file called `queueFeeds.js` that needs to be run on a cron job or similar scheduler. I like to run mine once a minute. It queries every RSS feed in the database to see if there has been a change to the feed. If there is a new post, it sends out the new post to everyone subscribed to its corresponding ActivityPub Actor.

## Local testing

You can use a service like [ngrok](https://ngrok.com/) to test things out before you deploy on a real server. All you need to do is install ngrok and run `ngrok http 3000` (or whatever port you're using if you changed it). Then go to your `config.json` and update the `DOMAIN` field to whatever `abcdef.ngrok.io` domain that ngrok gives you and restart your server.

Then make sure to manually run `updateFeed.js` when the feed changes. I recommend having your own test RSS feed that you can update whenever you want.

## Database

This server uses a SQLite database stored in the file `bot-node.db` to keep track of all the data. To connect directly to the database for debugging, from the root directory of the project, run:

```bash
sqlite3 bot-node.db
```

There are two tables in the database: `accounts` and `feeds`.

### `accounts`

This table keeps track of all the data needed for the accounts. Columns:

* `name` `TEXT PRIMARY KEY`: the account name, in the form `thename@example.com`
* `privkey` `TEXT`: the RSA private key for the account
* `pubkey` `TEXT`: the RSA public key for the account
* `webfinger` `TEXT`: the entire contents of the webfinger JSON served for this account
* `actor` `TEXT`: the entire contents of the actor JSON served for this account
* `apikey` `TEXT`: the API key associated with this account
* `followers` `TEXT`: a JSON-formatted array of the URL for the Actor JSON of all followers, in the form `["https://remote.server/users/somePerson", "https://another.remote.server/ourUsers/anotherPerson"]`
* `messages` `TEXT`: not yet used but will eventually store all messages so we can render them on a "profile" page

### `feeds`

This table keeps track of all the data needed for the feeds. Columns:

* `feed` `TEXT PRIMARY KEY`: the URI of the RSS feed
* `username` `TEXT`: the username associated with the RSS feed
* `content` `TEXT`: the most recent copy fetched of the RSS feed's contents
