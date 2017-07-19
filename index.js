const express = require('express');
const app = express();
const db = require('./db.js');
const SpotifyWebApi = require('spotify-web-api-node');
const config = require('./config.js');
const opn = require('opn');
const Spinner = require('cli-spinner').Spinner;

const spotify = new SpotifyWebApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: 'http://localhost:5000/spotify'
});

let authorizeSpotify = async () => {
    let data = await spotify.clientCredentialsGrant();
    await spotify.setAccessToken(data.body['access_token']);

    let authorizeURL = await spotify.createAuthorizeURL(['playlist-modify-public', 'playlist-modify-private'], 'state');

    app.get('/spotify', async (req, res) => {
        try {
            let data = await spotify.authorizationCodeGrant(req.query.code);
            await spotify.setAccessToken(data.body['access_token']);
            await spotify.setRefreshToken(data.body['refresh_token']);
            return res.send('<script>window.close()</script>');
        }
        catch (err) {
            console.log(err);
        }
    });

    app.listen(5000, async () => {
        console.log('Server running on port 5000');
    });

    opn(authorizeURL);
}

const main = async () => {
    await authorizeSpotify();
    await db.updateDatabase();
    console.log('Everything ready!');

    // Build playlists
    let songs = await db.getNewPlaylist();

    let spinner = new Spinner('%s Building playlist...');
    spinner.setSpinnerString(10);
    spinner.start();

    let playlistTracks = [];
    for (let song of songs) {
        let uri = await spotify.searchTracks('track:' + song.name + ' artist:' + song.artist.name);
        if (uri.body.items) {
            playlistTracks.push(uri.body.items[0].uri)
        }
    }

    spinner.stop(true)
    console.log('Playlist built. Creating on Spotify...');
    console.log(playlistTracks);

    let playlist = await spotify.createPlaylist('kaze.senoue', 'Semaninha', { public: true });
    await spotify.addTracksToPlaylist('kaze.senoue', playlist.body.id, playlistTracks);
    console.log('Tracks added! o/');
}

(async () => await main())();