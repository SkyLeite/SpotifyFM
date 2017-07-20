const express = require('express');
const app = express();
const db = require('./db.js');
const SpotifyWebApi = require('spotify-web-api-node');
const config = require('./config.js');
const opn = require('opn');
const Spinner = require('cli-spinner').Spinner;
const fs = require('mz/fs');
const _ = require('lodash');

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

    app.listen(5000, () => { });
    await opn(authorizeURL, { wait: true, app: 'chrome' })
}

const buildPlaylist = async (songs, name) => {
    let spinner = new Spinner('%s Building playlist. This might take a while (go grab a cup of coffee).');
    spinner.setSpinnerString(10);
    spinner.start();

    let playlistTracks = [];
    let i = 0;
    for (let song of songs) {
        i ++;
        spinner.setSpinnerTitle(`${(i / songs.length)}% Building playlist...`);
        let uri = await spotify.searchTracks('track:' + song.name + ' artist:' + song.artist.name);
        if (uri.body.tracks.items) {
            try {
                playlistTracks.push(uri.body.tracks.items[0].uri)
            } catch (err) {
                //console.log(err);
            }
        }
    }

    let playlist = await spotify.createPlaylist('kaze.senoue', name, { public: true });
    for (let i of _.chunk(playlistTracks, 99)) {
        await spotify.addTracksToPlaylist('kaze.senoue', playlist.body.id, i);
    }
    spinner.stop(true);
    console.log('-> Playlist successfully created. Have fun!');
}

const main = async () => {
    try {
        await authorizeSpotify();
        await db.updateDatabase();

        // Build week playlist
        await buildPlaylist(await db.getNewPlaylist(), 'Semaninha');

        // Build discovery playlist
        await buildPlaylist(await db.getDiscoveryPlaylist(), 'Novas');
        
        return;
    } catch (err) {
        console.error(err);
    }
}

(async () => await main())();