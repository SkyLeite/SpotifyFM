# SpotifyFM

Automatically creates / updates playlists on your Spotify account based on your Last.FM data. Code is a bit hack-ish because Last.FM doesn't expose the necessary data in a reliable format.

The script runs continuously, meaning you can leave it running indefinitely and it'll always keep your playlists updated. By default they're updated every 7 days, but you can change the code easily to make it fit your needs.

## Requirements

- [Node.js](https://nodejs.org/en/download/current/)

## Running

0. Make sure you have Node.JS installed (`node -v`)

1. Clone the repository OR [click here to download the ZIP](https://github.com/Kxze/SpotifyFM/archive/master.zip):

```git clone https://github.com/Kxze/SpotifyFM.git```

2. Install the necessary modules:

```npm install```

3. Edit the `config.js` file to contain the following information:

```javascript
module.exports = {
    user: '', // Your Last.FM username
    token: '', // Your Last.FM API Token (see 'Tokens')
    clientId: '', // Your Spotify client ID
    clientSecret: '' // Your Spotify client secret
}
```

4. Run the script:

```npm start```

## Tokens

These are the tokens you're gonna need to run this:

- [Last.FM API token](https://www.last.fm/api/account/create)

- [Spotify Web API token](https://developer.spotify.com/my-applications/#!/applications/create)

**IMPORTANT:** Don't forget to add `http://localhost:5000` as a callback URL when creating your Spotify Web API application

## FAQ

- "The script won't run! Help!"

Submit an issue.

- "Could you please add X feature?"

Submit an issue.

- "I want to help!"

Submit a PR.
